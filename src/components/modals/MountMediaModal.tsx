/* eslint-disable react/set-state-in-effect */
import { Dialog } from "./Dialog";
import React, { useState, useEffect } from "react";
import { validateIsoUrl } from "../../emulator/security";
import type { VMProfile } from "../../emulator/types";
import {
  X,
  Disc,
  HardDrive,
  Cpu,
  AlertCircle,
  Play,
  Shield,
  FileCheck,
  Terminal,
  Monitor,
  Info,
} from "lucide-react";

export interface MountMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBootCustomProfile: (profile: VMProfile) => void;
  initialProfile?: VMProfile | null;
}

interface DistroPreset {
  id: "kali" | "ubuntu" | "blackarch" | "custom";
  label: string;
  name: string;
  mode: "cli" | "gui";
  ramMB: number;
  vramMB: number;
  headline: string;
  instructions: string;
  tip: string;
  recommendedTypes: string;
}

const PRESETS: Record<"kali" | "ubuntu" | "blackarch" | "custom", DistroPreset> = {
  kali: {
    id: "kali",
    label: "Kali Linux",
    name: "Kali Linux 2024.3 i386",
    mode: "gui",
    ramMB: 1024,
    vramMB: 32,
    headline: "Kali Linux 2024.3 i386 (Final 32-bit Edition)",
    instructions:
      "Kali Linux 2024.3 is the historic final release supporting 32-bit x86 architecture. Provide an official Kali 32-bit netinst, installer, or live image (.iso, .img, .bin, .raw). Set RAM to at least 768 MB (1024 MB recommended for XFCE desktop).",
    tip: "Download the Kali 2024.3 i386 netinst or live ISO from official mirrors.",
    recommendedTypes: ".iso, .img, .bin, .raw",
  },
  ubuntu: {
    id: "ubuntu",
    label: "Ubuntu 18.04",
    name: "Ubuntu 18.04 LTS i386",
    mode: "gui",
    ramMB: 768,
    vramMB: 32,
    headline: "Ubuntu 18.04 LTS (Bionic Beaver 32-bit)",
    instructions:
      "Ubuntu 18.04 LTS is the last LTS release with official 32-bit PC (i386) support. Mount an Ubuntu server/netboot mini.iso (~65 MB) or Xubuntu 18.04 i386 desktop ISO (.iso, .img).",
    tip: "Use mini.iso for rapid testing or Xubuntu 18.04 desktop for XFCE.",
    recommendedTypes: ".iso, .img, .bin, .raw",
  },
  blackarch: {
    id: "blackarch",
    label: "BlackArch",
    name: "BlackArch Linux 32-bit",
    mode: "cli",
    ramMB: 768,
    vramMB: 16,
    headline: "BlackArch Linux (Arch 32 Security Toolkit)",
    instructions:
      "BlackArch security toolchain compiled for i686. Mount a 32-bit BlackArch Slim, Netinstall, or raw system disk image (.iso, .img, .bin, .raw). 768 MB RAM recommended.",
    tip: "BlackArch Slim or Netinstall 32-bit image recommended.",
    recommendedTypes: ".iso, .img, .bin, .raw",
  },
  custom: {
    id: "custom",
    label: "Custom / Generic",
    name: "Custom Linux VM",
    mode: "gui",
    ramMB: 512,
    vramMB: 16,
    headline: "Generic 32-bit x86 Bootable Media",
    instructions:
      "Mount any 32-bit bootable image (.iso, .img, .bin, .raw) such as Alpine Linux, Debian 32, FreeDOS, Tiny Core, or custom kernels. The image boots entirely client-side in WebAssembly.",
    tip: "Ensure your media is formatted for 32-bit x86 (i386/i686) PCs.",
    recommendedTypes: ".iso, .img, .bin, .raw",
  },
};

export const MountMediaModal: React.FC<MountMediaModalProps> = ({
  isOpen,
  onClose,
  onBootCustomProfile,
  initialProfile,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<"kali" | "ubuntu" | "blackarch" | "custom">("custom");
  const [sourceType, setSourceType] = useState<"file" | "url">("url");
  const [name, setName] = useState("Custom Linux");
  const [mediaUrl, setMediaUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ramMB, setRamMB] = useState(512);
  const [vramMB, setVramMB] = useState(16);
  const [mode, setMode] = useState<"cli" | "gui">("gui");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [busy, setBusy] = useState(false);

  // Synchronize when opened with an initial profile preset
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => {
    if (!isOpen) return;

    if (initialProfile) {
      let presetKey: "kali" | "ubuntu" | "blackarch" | "custom" = "custom";
      if (initialProfile.category === "kali" || initialProfile.id.includes("kali")) {
        presetKey = "kali";
      } else if (initialProfile.category === "ubuntu" || initialProfile.id.includes("ubuntu")) {
        presetKey = "ubuntu";
      } else if (initialProfile.category === "blackarch" || initialProfile.id.includes("blackarch")) {
        presetKey = "blackarch";
      }

      setSelectedPreset(presetKey);
      setName(initialProfile.name);
      setMode(initialProfile.mode);
      setRamMB(Math.round(initialProfile.memorySize / (1024 * 1024)) || PRESETS[presetKey].ramMB);
      setVramMB(Math.round(initialProfile.vgaMemorySize / (1024 * 1024)) || PRESETS[presetKey].vramMB);
    } else {
      setSelectedPreset("custom");
      setName("Custom Linux");
      setRamMB(512);
      setVramMB(16);
      setMode("gui");
    }
  }, [isOpen, initialProfile]);

  if (!isOpen) return null;

  const applyPreset = (presetKey: "kali" | "ubuntu" | "blackarch" | "custom") => {
    setSelectedPreset(presetKey);
    const preset = PRESETS[presetKey];
    setName(preset.name);
    setMode(preset.mode);
    setRamMB(preset.ramMB);
    setVramMB(preset.vramMB);
  };

  const handleFileSelection = (file: File) => {
    setSelectedFile(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, "");
    if (!name || name === "Custom Linux" || name.includes("i386")) {
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
        id: initialProfile?.id ? `${initialProfile.id}_custom_${Date.now()}` : `custom_${Date.now()}`,
        name: name.trim() || "Custom VM",
        category: (initialProfile?.category || (selectedPreset !== "custom" ? selectedPreset : "custom")) as VMProfile["category"],
        mode: mode,
        description:
          initialProfile?.description ||
          `User-mounted custom ${sourceType === "file" ? selectedFile?.name || "file" : "URL"} media.`,
        tagline: `${name.trim()} • ${ramMB} MB RAM • ${mode.toUpperCase()}`,
        memorySize: ramMB * 1024 * 1024,
        vgaMemorySize: vramMB * 1024 * 1024,
        cdromBuffer,
        cdromUrl,
        netDevice: initialProfile?.netDevice || "virtio",
      };

      onBootCustomProfile(customProfile);
      onClose();
    } catch (error) {
      alert(String(error instanceof Error ? error.message : error));
    } finally {
      setBusy(false);
    }
  };

  const activePreset = PRESETS[selectedPreset];

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
          {/* Distro Preset Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Pre-Fill Configuration Preset
              </label>
              <span className="text-[11px] text-slate-400">Click to pre-fill specs</span>
            </div>
            <div
              role="radiogroup"
              aria-label="OS Distro Presets"
              className="grid grid-cols-2 sm:grid-cols-4 gap-1.5"
            >
              {(["kali", "ubuntu", "blackarch", "custom"] as const).map((key) => {
                const p = PRESETS[key];
                const isSelected = selectedPreset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => applyPreset(key)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1 transition ${
                      isSelected
                        ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-sm"
                        : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                    }`}
                  >
                    {key === "kali" && <Shield className="w-3 h-3 text-cyan-400" />}
                    {key === "ubuntu" && <Monitor className="w-3 h-3 text-amber-400" />}
                    {key === "blackarch" && <Terminal className="w-3 h-3 text-emerald-400" />}
                    {key === "custom" && <Disc className="w-3 h-3 text-indigo-400" />}
                    <span className="truncate">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preset Specific Instructions Banner */}
          <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-cyan-200 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-cyan-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-cyan-400" />
              <span>{activePreset.headline}</span>
            </div>
            <p className="leading-relaxed text-cyan-200/90 pl-6">
              {activePreset.instructions}
            </p>
            <div className="pl-6 text-[11px] text-cyan-400/80 flex items-center gap-1.5 pt-0.5">
              <Info className="w-3 h-3 shrink-0" />
              <span>{activePreset.tip}</span>
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
                placeholder="e.g. Kali 2024.3 Custom"
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
                <option value={768}>768 MB (Balanced / Pen-Test)</option>
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
