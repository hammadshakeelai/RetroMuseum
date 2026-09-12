import type { VMSnapshot } from "./types";

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

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSnapshot(
  profileId: string,
  profileName: string,
  label: string,
  data: ArrayBuffer
): Promise<VMSnapshot> {
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
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(snapshot);

    req.onsuccess = () => resolve(snapshot);
    req.onerror = () => reject(req.error);
  });
}

export async function listSnapshots(profileId?: string): Promise<VMSnapshot[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = profileId
      ? store.index("profileId").getAll(profileId)
      : store.getAll();

    req.onsuccess = () => {
      const results = (req.result as VMSnapshot[]).sort((a, b) => b.timestamp - a.timestamp);
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getSnapshot(id: string): Promise<VMSnapshot | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
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

    req.onsuccess = () => resolve();
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
  URL.revokeObjectURL(url);
}

export async function importSnapshotFromFile(
  file: File,
  profileId: string,
  profileName: string
): Promise<VMSnapshot> {
  const buffer = await file.arrayBuffer();
  return saveSnapshot(
    profileId,
    profileName,
    file.name.replace(/\.[^/.]+$/, ""),
    buffer
  );
}
