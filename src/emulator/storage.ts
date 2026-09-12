import type { VMSnapshot } from "./types";
import { validateSnapshotBuffer, MAX_SNAPSHOT_SIZE } from "./security";

export type SnapshotSummary = Omit<VMSnapshot, "data">;

const DB_NAME = "WebOS_V86_DB";
const STORE_NAME = "snapshots";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("profileId", "profileId", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };

    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onblocked = () => reject(new Error("Close other WebOS tabs to upgrade snapshot storage."));
    request.onerror = () => reject(request.error);
  });
}

export async function saveSnapshot(
  profileId: string,
  profileName: string,
  label: string,
  data: ArrayBuffer
): Promise<VMSnapshot> {
  if (!data || !(data instanceof ArrayBuffer)) {
    throw new Error("Invalid snapshot data: expected an ArrayBuffer.");
  }
  if (data.byteLength === 0) {
    throw new Error("The snapshot buffer is empty.");
  }
  if (data.byteLength > MAX_SNAPSHOT_SIZE) {
    throw new Error(`Snapshot data exceeds maximum allowed size (${MAX_SNAPSHOT_SIZE / (1024 * 1024 * 1024)} GB).`);
  }
  const db = await openDB();
  const snapshot: VMSnapshot = {
    id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    profileId,
    profileName,
    timestamp: Date.now(),
    label: label || `Snapshot ${new Date().toLocaleTimeString()}`,
    sizeBytes: data.byteLength,
    data,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.onabort = () => { db.close(); reject(tx.error || new Error("Snapshot write aborted.")); };
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(snapshot);

    tx.oncomplete = () => { db.close(); resolve(snapshot); };
    req.onerror = () => reject(req.error);
  });
}

export async function listSnapshots(profileId?: string): Promise<SnapshotSummary[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = profileId ? store.index("profileId").openCursor(profileId) : store.openCursor();
    const summaries: SnapshotSummary[] = [];
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const { id, profileId, profileName, timestamp, label, sizeBytes } = cursor.value as VMSnapshot;
      summaries.push({ id, profileId, profileName, timestamp, label, sizeBytes });
      cursor.continue();
    };
    tx.oncomplete = () => { db.close(); resolve(summaries.sort((a, b) => b.timestamp - a.timestamp)); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error("Could not read snapshots.")); };
  });
}

export async function getSnapshot(id: string): Promise<VMSnapshot | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    tx.oncomplete = () => db.close();
    tx.onabort = () => { db.close(); reject(tx.error); };
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSnapshot(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    tx.oncomplete = () => { db.close(); resolve(); };
    req.onerror = () => reject(req.error);
  });
}

export function exportSnapshotToFile(snapshot: VMSnapshot) {
  const blob = new Blob([snapshot.data], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeLabel = snapshot.label.replace(/[^a-zA-Z0-9_-]/g, "_");
  a.download = `${snapshot.profileId}_${safeLabel}.bin`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importSnapshotFromFile(
  file: File,
  profileId: string,
  profileName: string
): Promise<VMSnapshot> {
  if (file.size === 0) throw new Error("The snapshot file is empty.");
  if (file.size > MAX_SNAPSHOT_SIZE) {
    throw new Error(`The snapshot file exceeds the maximum allowed size (${MAX_SNAPSHOT_SIZE / (1024 * 1024 * 1024)} GB).`);
  }
  const buffer = await file.arrayBuffer();
  validateSnapshotBuffer(buffer, { requireUncompressed: true });
  return saveSnapshot(
    profileId,
    profileName,
    file.name.replace(/\.[^/.]+$/, ""),
    buffer
  );
}
