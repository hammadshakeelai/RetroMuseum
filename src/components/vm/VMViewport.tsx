import React, { useState } from "react";
import type { VMStatus, VMProfile } from "../../emulator/types";
import { Loader2, AlertTriangle, UploadCloud, Power } from "lucide-react";

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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileDrop(e.dataTransfer.files[0]);
    }
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
        className={`v86-screen-target flex items-center justify-center max-w-full max-h-full cursor-pointer transition-all ${
          crtEnabled ? "crt-effect" : ""
        }`}
        tabIndex={0}
      />

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-cyan-950/80 backdrop-blur-sm border-2 border-dashed border-cyan-400 z-40 flex flex-col items-center justify-center text-cyan-200">
          <UploadCloud className="w-16 h-16 animate-bounce text-cyan-400 mb-3" />
          <p className="text-base font-semibold">Drop file to copy into Linux VM</p>
          <p className="text-xs text-cyan-300/70 mt-1">
            File will be placed in <code className="font-mono bg-cyan-900/50 px-1 py-0.5 rounded">/root/</code>
          </p>
        </div>
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
            className="mt-6 px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition transform active:scale-95"
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
            className="mt-4 px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
          >
            Retry Boot
          </button>
        </div>
      )}
    </div>
  );
};
