import React, { useState } from "react";
import { X, Disc, HardDrive, Cpu, AlertCircle, Play } from "lucide-react";
import type { VMProfile } from "../../emulator/types";

interface MountMediaModalProps {
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

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setName(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let cdromBuffer: ArrayBuffer | undefined = undefined;
    let cdromUrl: string | undefined = undefined;

    if (sourceType === "file") {
      if (!selectedFile) {
        alert("Please select an ISO or disk image file.");
        return;
      }
      cdromBuffer = await selectedFile.arrayBuffer();
    } else {
      if (!mediaUrl) {
        alert("Please enter a valid ISO / image URL.");
        return;
      }
      cdromUrl = mediaUrl;
    }

    const customProfile: VMProfile = {
      id: `custom_${Date.now()}`,
      name: name || "Custom VM",
      category: "custom",
      mode: mode,
      description: `User-mounted custom ${sourceType === "file" ? "file" : "URL"} image.`,
      tagline: `Custom Image • ${ramMB} MB RAM • ${mode.toUpperCase()}`,
      memorySize: ramMB * 1024 * 1024,
      vgaMemorySize: vramMB * 1024 * 1024,
      cdromBuffer,
      cdromUrl,
      netDevice: "virtio",
    };

    onBootCustomProfile(customProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Disc className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              Mount Custom ISO / Disk Image
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-cyan-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-cyan-400" />
            <p className="leading-relaxed">
              Mount any 32-bit x86 ISO (e.g. Kali 2024.3 i386, Ubuntu 18.04, Debian 32, Alpine). The image boots client-side in WebAssembly!
            </p>
          </div>

          {/* Name & Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Environment Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kali 2024.3 Custom"
                className="w-full bg-slate-950 border border-slate-700/80 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Display Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as "cli" | "gui")}
                className="w-full bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="gui">GUI (Desktop / X11)</option>
                <option value="cli">CLI (Terminal Only)</option>
              </select>
            </div>
          </div>

          {/* Source Tabs */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Image Source</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSourceType("url")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                  sourceType === "url"
                    ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Remote ISO URL</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceType("file")}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                  sourceType === "file"
                    ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Disc className="w-3.5 h-3.5" />
                <span>Upload Local File</span>
              </button>
            </div>

            {sourceType === "url" ? (
              <div className="pt-1">
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://your-domain.com/kali-2024.3-i386.iso"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Server must allow CORS headers (<code className="font-mono text-cyan-300">Access-Control-Allow-Origin: *</code>).
                </p>
              </div>
            ) : (
              <div className="pt-1">
                <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/40">
                  <Disc className="w-8 h-8 text-cyan-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-200">
                    {selectedFile ? selectedFile.name : "Select .iso or .img from disk"}
                  </span>
                  {selectedFile && (
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  )}
                  <input
                    type="file"
                    accept=".iso,.img,.bin"
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
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>RAM Allocation</span>
              </label>
              <select
                value={ramMB}
                onChange={(e) => setRamMB(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value={256}>256 MB (Low)</option>
                <option value={512}>512 MB (Standard)</option>
                <option value={768}>768 MB (Balanced)</option>
                <option value={1024}>1024 MB (Recommended for Desktop)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">VGA Memory</label>
              <select
                value={vramMB}
                onChange={(e) => setVramMB(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700/80 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value={8}>8 MB (CLI)</option>
                <option value={16}>16 MB (Standard)</option>
                <option value={32}>32 MB (High Resolution GUI)</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow flex items-center gap-1.5 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Boot Custom VM</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
