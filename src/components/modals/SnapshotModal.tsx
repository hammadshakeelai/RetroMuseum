import { Dialog } from "./Dialog";
import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Download,
  Upload,
  Trash2,
  Play,
  Clock,
  HardDrive,
  CheckCircle2,
} from "lucide-react";
import type { VMSnapshot, VMStatus } from "../../emulator/types";
import {
  getSnapshot,
  listSnapshots,
  deleteSnapshot,
  exportSnapshotToFile,
  importSnapshotFromFile,
  type SnapshotSummary,
} from "../../emulator/storage";

interface SnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: VMStatus;
  currentProfileId: string;
  currentProfileName: string;
  onSaveSnapshot: (label: string) => Promise<VMSnapshot>;
  onRestoreSnapshot: (buffer: ArrayBuffer) => Promise<void>;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({
  isOpen,
  onClose,
  status,
  currentProfileId,
  currentProfileName,
  onSaveSnapshot,
  onRestoreSnapshot,
}) => {
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadSnapshots = async () => {
    try {
      const items = await listSnapshots(currentProfileId);
      setSnapshots(items);
    } catch (e) {
      console.error("Failed to load snapshots:", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void listSnapshots(currentProfileId).then(setSnapshots).catch(error => alert(String(error)));
    }
  }, [isOpen, currentProfileId]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "running" && status !== "paused") {
      alert("VM must be running or paused to save a memory snapshot.");
      return;
    }
    setIsSaving(true);
    try {
      await onSaveSnapshot(newLabel || `${currentProfileName} Snapshot`);
      setNewLabel("");
      setSuccessMsg("Snapshot saved to IndexedDB!");
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadSnapshots();
    } catch (err) {
      alert("Error saving snapshot: " + err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async (snap: SnapshotSummary) => {
    if (confirm(`Restore snapshot "${snap.label}"? Unsaved changes will be overwritten.`)) {
      try {
        const snapshot = await getSnapshot(snap.id);
        if (!snapshot) throw new Error("Snapshot no longer exists.");
        await onRestoreSnapshot(snapshot.data);
        onClose();
      } catch (err) {
        alert("Error restoring snapshot: " + err);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this snapshot from browser storage?")) {
      try {
        await deleteSnapshot(id);
        await loadSnapshots();
      } catch (error) { alert(String(error)); }
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        await importSnapshotFromFile(file, currentProfileId, currentProfileName);
        await loadSnapshots();
        setSuccessMsg("Imported snapshot file!");
        setTimeout(() => setSuccessMsg(null), 3000);
      } catch (err) {
        alert("Import error: " + err);
      }
    }
  };

  return (
    <Dialog label="Snapshot" onClose={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Save className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              VM State Snapshots (IndexedDB)
            </h2>
          </div>
          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {successMsg && (
            <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Save Snapshot Form */}
          <form onSubmit={handleSave} className="flex gap-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Snapshot label (e.g. After installing gcc)..."
              disabled={isSaving || (status !== "running" && status !== "paused")}
              className="flex-1 bg-slate-950 border border-slate-700/80 rounded px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={isSaving || (status !== "running" && status !== "paused")}
              className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Save State"}</span>
            </button>
          </form>

          {/* Import / Export Controls */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Saved Snapshots ({snapshots.length})
            </span>
            <label className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import .bin state</span>
              <input
                type="file"
                accept=".bin"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>

          {/* Snapshot List */}
          {snapshots.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-800 rounded-lg text-center text-slate-500 text-xs">
              <HardDrive className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No snapshots saved in browser storage yet. Click &quot;Save State&quot; while Linux is running to freeze your environment!
            </div>
          ) : (
            <div className="space-y-2">
              {snapshots.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-3 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-slate-200 truncate">{s.label}</h4>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {s.profileName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(s.timestamp).toLocaleString()}
                      </span>
                      <span>{(s.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={isSaving || status === "booting" || status === "saving" || status === "restoring"}
                      onClick={() => handleRestore(s)}
                      className="p-1.5 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300 transition"
                      title="Restore Snapshot into RAM"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const snapshot = await getSnapshot(s.id);
                          if (!snapshot) throw new Error("Snapshot no longer exists.");
                          exportSnapshotToFile(snapshot);
                        } catch (error) { alert(String(error)); }
                      }}
                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="Download .bin file to disk"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/40 text-rose-400 transition"
                      title="Delete from browser storage"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};
