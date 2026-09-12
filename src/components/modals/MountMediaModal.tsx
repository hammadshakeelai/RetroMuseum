import { Dialog } from "./Dialog";
import React, { useState } from "react";
import { validateIsoUrl } from "../../emulator/security";
import type { VMProfile } from "../../emulator/types";
import {
  X,
  Disc,
  HardDrive,
  Cpu,
  AlertCircle,
  Play,
  FileCheck,
  Info,
} from "lucide-react";

export interface MountMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBootCustomProfile: (profile: VMProfile) => void;
}

export const MountMediaModal: React.FC<MountMediaModalProps> = ({
  isOpen,
  onClose,
  onBootCustomProfile,
}) => {
  const [sourceType, setSourceType] = useState<"file" | "url">("url");
  const [name, setName] = useState("Custom Linux");
  const [mediaUrl, setMediaUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ramMB, setRamMB] = useState(512);
  const [vramMB, setVramMB] = useState(16);
  const [mode, setMode] = useState<"cli" | "gui">("gui");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleFileSelection = (file: File) => {
    setSelectedFile(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, "");
    if (!name || name === "Custom Linux") {
      setName(cleanName);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (busy) return;
    setBusy(true);
    try {
      let cdromBuffer: ArrayBuffer | undefined = undefined;
      let cdromUrl: string | undefined = undefined;

      if (sourceType === "file") {
        if (!selectedFile) {
          alert("Please select an ISO or disk image file (.iso, .img, .bin, .raw).");
          return;
        }
        if (!selectedFile.size) throw new Error("The selected disk image is empty.");
        cdromBuffer = await selectedFile.arrayBuffer();
      } else {
        const validated = validateIsoUrl(mediaUrl);
        cdromUrl = validated;
      }

      const customProfile: VMProfile = {
        id: `custom_${Date.now()}`,
        name: name.trim() || "Custom VM",
        category: "custom",
        mode: mode,
        description: `User-mounted custom ${sourceType === "file" ? selectedFile?.name || "file" : "URL"} media.`,
        tagline: `${name.trim()} • ${ramMB} MB RAM • ${mode.toUpperCase()}`,
        memorySize: ramMB * 1024 * 1024,
        vgaMemorySize: vramMB * 1024 * 1024,
        cdromBuffer,
        cdromUrl,
        netDevice: "virtio",
      };

      onBootCustomProfile(customProfile);
      onClose();
    } catch (error) {
      alert(String(error instanceof Error ? error.message : error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog label="Mount Custom Media" onClose={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg max-h-[90dvh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <Disc className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              Mount Custom Media
            </h2>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono">
              .iso / .img / .bin / .raw
            </span>
          </div>
          <button
            aria-label="Close dialog"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Instructions */}
          <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-cyan-200 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-cyan-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-cyan-400" />
              <span>Generic 32-bit x86 Bootable Media</span>
            </div>
            <p className="leading-relaxed text-cyan-200/90 pl-6">
              Mount any 32-bit bootable image (.iso, .img, .bin, .raw) such as Alpine Linux, Debian 32, FreeDOS, Tiny Core, or custom kernels. The image boots entirely client-side in WebAssembly.
            </p>
            <div className="pl-6 text-[11px] text-cyan-400/80 flex items-center gap-1.5 pt-0.5">
              <Info className="w-3 h-3 shrink-0" />
              <span>Ensure your media is formatted for 32-bit x86 (i386/i686) PCs.</span>
            </div>
          </div>

          {/* Name & Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="vm-name-input" className="text-xs font-semibold text-slate-300">
                Environment Name
              </label>
              <input
                id="vm-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alpine Linux 3.19"
                className="w-full bg-slate-950 border border-slate-700/80 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="vm-mode-select" className="text-xs font-semibold text-slate-300">
                Display Mode
              </label>
              <select
                id="vm-mode-select"
                value={mode}
                onChange={(e) => setMode(e.target.value as "cli" | "gui")}
                className="w-full bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
              >
                <option value="gui">GUI (Desktop / X11)</option>
                <option value="cli">CLI (Terminal Only)</option>
              </select>
            </div>
          </div>

          {/* Source Tabs */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Image Source</label>
            <div className="grid grid-cols-2 gap-2" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={sourceType === "url"}
                onClick={() => setSourceType("url")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                  sourceType === "url"
                    ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Remote Image URL</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sourceType === "file"}
                onClick={() => setSourceType("file")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                  sourceType === "file"
                    ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Disc className="w-3.5 h-3.5" />
                <span>Upload Local Image</span>
              </button>
            </div>

            {sourceType === "url" ? (
              <div className="pt-1 space-y-1">
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://your-domain.com/disk.iso (or .img, .bin, .raw)"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
                />
                <p className="text-[11px] text-slate-400">
                  Server must allow CORS headers (
                  <code className="font-mono text-cyan-300">Access-Control-Allow-Origin: *</code>).
                </p>
              </div>
            ) : (
              <div className="pt-1">
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleFileSelection(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition ${
                    isDraggingFile
                      ? "border-cyan-400 bg-cyan-950/60"
                      : "border-slate-700 hover:border-cyan-500/60 bg-slate-950/40"
                  }`}
                >
                  {selectedFile ? (
                    <FileCheck className="w-8 h-8 text-emerald-400 mb-1" />
                  ) : (
                    <Disc className="w-8 h-8 text-cyan-400 mb-1" />
                  )}
                  <span className="text-xs font-semibold text-slate-200 text-center">
                    {selectedFile
                      ? selectedFile.name
                      : "Select or drop .iso, .img, .bin, or .raw disk image"}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {selectedFile
                      ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                      : "Accepts 32-bit x86 .iso, .img, .bin, .raw media"}
                  </span>
                  <input
                    type="file"
                    accept=".iso,.img,.bin,.raw"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Hardware Presets */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label htmlFor="vm-ram-select" className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>RAM Allocation</span>
              </label>
              <select
                id="vm-ram-select"
                value={ramMB}
                onChange={(e) => setRamMB(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
              >
                <option value={256}>256 MB (Minimal)</option>
                <option value={512}>512 MB (Standard CLI)</option>
                <option value={768}>768 MB (Balanced)</option>
                <option value={1024}>1024 MB (Recommended for Desktop)</option>
                <option value={1536}>1536 MB (Heavy Workloads)</option>
                <option value={2048}>2048 MB (Max 32-bit Browser RAM)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="vm-vram-select" className="text-xs font-semibold text-slate-300">
                VGA Memory
              </label>
              <select
                id="vm-vram-select"
                value={vramMB}
                onChange={(e) => setVramMB(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
              >
                <option value={8}>8 MB (CLI)</option>
                <option value={16}>16 MB (Standard)</option>
                <option value={32}>32 MB (High Resolution GUI)</option>
                <option value={64}>64 MB (Extended Desktop)</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              aria-label="Close dialog"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              disabled={busy}
              type="submit"
              className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold shadow flex items-center gap-1.5 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{busy ? "Loading Media..." : "Boot Custom VM"}</span>
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};
