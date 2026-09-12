import React, { useState, useEffect } from "react";
import type { VMStatus, VMProfile } from "../../emulator/types";
import { Loader2, AlertTriangle, UploadCloud, Power, X, AlertCircle } from "lucide-react";

interface VMViewportProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  status: VMStatus;
  profile: VMProfile;
  error: string | null;
  crtEnabled: boolean;
  onStart: () => void;
  onFileDrop: (file: File) => void;
}

export const VMViewport: React.FC<VMViewportProps> = ({
  containerRef,
  status,
  profile,
  error,
  crtEnabled,
  onStart,
  onFileDrop,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [dropFeedback, setDropFeedback] = useState<{
    type: "warning" | "info" | "error";
    message: string;
  } | null>(null);

  const hasFilesystem = Boolean(profile.filesystem);

  // Auto-dismiss drop notifications after 7 seconds
  useEffect(() => {
    if (!dropFeedback) return;
    const timer = setTimeout(() => setDropFeedback(null), 7000);
    return () => clearTimeout(timer);
  }, [dropFeedback]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    const file = e.dataTransfer.files[0];

    // Clear feedback when profile does not have 9P filesystem support
    if (!hasFilesystem) {
      setDropFeedback({
        type: "warning",
        message: `File transfer not supported: "${profile.name}" runs without a 9P VirtIO filesystem. Switch to Micro Sandbox or Arch Linux for drag-and-drop file transfers, or use the Paste modal for scripts.`,
      });
      return;
    }

    // Inform user if VM is not powered on
    if (status !== "running") {
      setDropFeedback({
        type: "info",
        message: `Power on "${profile.name}" before dropping files to upload into ${profile.sharedDirectory || "/root"}/.`,
      });
      return;
    }

    onFileDrop(file);
  };

  return (
    <div
      className="relative flex-1 w-full bg-black overflow-hidden flex items-center justify-center select-none"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* v86 Hardware Canvas & Text Container */}
      <div
        ref={containerRef}
        className={`v86-screen-target flex items-center justify-center max-w-full max-h-full cursor-pointer transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
          crtEnabled ? "crt-effect" : ""
        }`}
        tabIndex={0}
        role="region"
        aria-label={`${profile.name} interactive display and terminal`}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />

      {/* Focus & Keyboard Capture Status Indicator */}
      {status === "running" && (
        <div
          aria-live="polite"
          className="absolute top-2 right-2 z-20 pointer-events-none px-2 py-0.5 rounded text-[10px] font-mono font-medium flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-sm border transition"
          style={{
            borderColor: isFocused ? "rgba(52, 211, 153, 0.4)" : "rgba(100, 116, 139, 0.3)",
            color: isFocused ? "#34d399" : "#94a3b8",
          }}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isFocused ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
            }`}
          />
          <span>{isFocused ? "Keyboard Active" : "Click to Focus"}</span>
        </div>
      )}

      {/* Drop Feedback Notification */}
      {dropFeedback && (
        <div
          role="alert"
          aria-live="polite"
          className={`absolute top-3 left-3 right-3 z-30 p-3 rounded-lg border shadow-xl flex items-start gap-2.5 backdrop-blur-md transition-all ${
            dropFeedback.type === "warning"
              ? "bg-amber-950/90 border-amber-500/60 text-amber-200"
              : dropFeedback.type === "error"
              ? "bg-rose-950/90 border-rose-500/60 text-rose-200"
              : "bg-cyan-950/90 border-cyan-500/60 text-cyan-200"
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div className="flex-1 text-xs font-medium leading-relaxed">
            {dropFeedback.message}
          </div>
          <button
            type="button"
            onClick={() => setDropFeedback(null)}
            aria-label="Dismiss message"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-black/30 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Drag & Drop Overlay */}
      {isDragging && (
        hasFilesystem ? (
          <div className="absolute inset-0 bg-cyan-950/85 backdrop-blur-sm border-2 border-dashed border-cyan-400 z-40 flex flex-col items-center justify-center text-cyan-200 p-6 text-center animate-in fade-in duration-150">
            <UploadCloud className="w-16 h-16 animate-bounce text-cyan-400 mb-3" />
            <p className="text-base font-bold text-white">Drop file to copy into Linux VM</p>
            <p className="text-xs text-cyan-300/80 mt-1.5">
              File will be placed in{" "}
              <code className="font-mono bg-cyan-900/60 px-1.5 py-0.5 rounded text-cyan-200 border border-cyan-700/50">
                {profile.sharedDirectory || "/root"}/
              </code>
            </p>
          </div>
        ) : (
          <div className="absolute inset-0 bg-amber-950/90 backdrop-blur-sm border-2 border-dashed border-amber-500/80 z-40 flex flex-col items-center justify-center text-amber-200 p-6 text-center animate-in fade-in duration-150">
            <AlertTriangle className="w-16 h-16 text-amber-400 mb-3 animate-pulse" />
            <p className="text-base font-bold text-amber-100">Filesystem Sharing Unavailable</p>
            <p className="text-xs text-amber-300/90 mt-1.5 max-w-sm leading-relaxed">
              <span className="font-semibold text-white">{profile.name}</span> does not have 9P VirtIO filesystem support enabled. Direct file drag & drop cannot write to this VM.
            </p>
            <p className="text-[11px] text-amber-400/80 mt-2 bg-amber-900/40 px-2.5 py-1 rounded border border-amber-800/50">
              Switch to Micro Linux or Arch Linux for 9P file sharing, or use the Paste tool for scripts.
            </p>
          </div>
        )
      )}

      {/* Initial Idle Screen */}
      {status === "idle" && (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 to-slate-900/95 z-20 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4 text-cyan-400 shadow-xl shadow-cyan-500/10">
            <Power className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">{profile.name}</h2>
          <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">{profile.description}</p>
          <div className="mt-3 flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-md border border-slate-800">
            <span>RAM: {Math.round(profile.memorySize / (1024 * 1024))} MB</span>
            <span>•</span>
            <span>VRAM: {Math.round(profile.vgaMemorySize / (1024 * 1024))} MB</span>
            <span>•</span>
            <span className="text-cyan-400 font-semibold">{profile.mode.toUpperCase()}</span>
          </div>
          <button
            onClick={onStart}
            className="mt-6 px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            Power On & Boot VM
          </button>
        </div>
      )}

      {/* Booting Loader */}
      {status === "booting" && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-xs z-20 flex flex-col items-center justify-center text-center p-4">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-3" />
          <h3 className="text-sm font-semibold text-slate-100">Initializing Virtual Machine...</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {profile.stateUrl
              ? "Downloading memory snapshot & resuming state..."
              : "Executing SeaBIOS & booting Linux kernel..."}
          </p>
        </div>
      )}

      {/* Snapshot Saving / Restoring Loader */}
      {(status === "saving" || status === "restoring") && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-xs z-20 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
          <h3 className="text-sm font-semibold text-emerald-300">
            {status === "saving" ? "Capturing VM Memory State..." : "Restoring Snapshot into RAM..."}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Please wait a moment</p>
        </div>
      )}

      {/* Error State */}
      {status === "error" && (
        <div className="absolute inset-0 bg-rose-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center text-rose-200">
          <AlertTriangle className="w-12 h-12 text-rose-400 mb-3" />
          <h3 className="text-sm font-bold text-white">VM Emulation Error</h3>
          <p className="text-xs text-rose-300 mt-1 max-w-md font-mono bg-rose-900/40 p-2 rounded border border-rose-800/60">
            {error || "An unexpected error occurred during execution."}
          </p>
          <button
            onClick={onStart}
            className="mt-4 px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            Retry Boot
          </button>
        </div>
      )}
    </div>
  );
};
