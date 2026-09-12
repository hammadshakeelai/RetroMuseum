import React from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize2,
  Camera,
  ClipboardPaste,
  Upload,
  Tv,
  Terminal,
} from "lucide-react";

import type { VMStatus } from "../../emulator/types";

interface VMToolbarProps {
  status: VMStatus;
  crtEnabled: boolean;
  onToggleCrt: () => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onResetClean: () => void;
  onFullscreen: () => void;
  onScreenshot: () => void;
  onOpenPasteModal: () => void;
  onOpenFileUpload: () => void;
  onOpenLogsModal: () => void;
}

export const VMToolbar: React.FC<VMToolbarProps> = ({
  status,
  crtEnabled,
  onToggleCrt,
  onStart,
  onPause,
  onResume,
  onRestart,
  onResetClean,
  onFullscreen,
  onScreenshot,
  onOpenPasteModal,
  onOpenFileUpload,
  onOpenLogsModal,
}) => {
  return (
    <div className="h-11 bg-slate-900/90 border-b border-slate-800/80 px-3 flex items-center justify-between select-none">
      {/* Power & Execution State */}
      <div className="flex items-center gap-1.5">
        {status === "idle" || status === "error" ? (
          <button
            onClick={onStart}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition"
            title="Start Virtual Machine"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Power On</span>
          </button>
        ) : status === "running" ? (
          <button
            onClick={onPause}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-semibold shadow-sm transition"
            title="Pause Emulation Execution"
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>Pause</span>
          </button>
        ) : (
          <button
            onClick={onResume}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition"
            title="Resume Emulation Execution"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Resume</span>
          </button>
        )}

        <button
          onClick={onRestart}
          disabled={status === "idle"}
          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium transition"
          title="Warm Reboot VM"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reboot</span>
        </button>

        <button
          onClick={onResetClean}
          disabled={status === "idle"}
          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-transparent hover:border-rose-700/50 text-xs font-medium transition"
          title="Reset to Pristine Factory OS State"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Factory Reset</span>
        </button>
      </div>

      {/* Utilities & Input Tools */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpenPasteModal}
          disabled={status === "idle"}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white text-xs font-medium transition"
          title="Type text or paste commands directly into Linux terminal"
        >
          <ClipboardPaste className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden lg:inline">Paste Command</span>
        </button>

        <button
          onClick={onOpenFileUpload}
          disabled={status === "idle"}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white text-xs font-medium transition"
          title="Upload file into Linux /root/ directory"
        >
          <Upload className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden lg:inline">Upload File</span>
        </button>

        <div className="h-4 w-[1px] bg-slate-800 mx-0.5" />

        <button
          onClick={onToggleCrt}
          className={`p-1.5 rounded transition ${
            crtEnabled
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              : "bg-slate-800 text-slate-400 hover:text-slate-200"
          }`}
          title="Toggle Vintage CRT Scanlines Effect"
        >
          <Tv className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onScreenshot}
          disabled={status === "idle"}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-400 hover:text-slate-200 transition"
          title="Capture High-Res VM Screen Snapshot (PNG)"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenLogsModal}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
          title="View Serial Port Diagnostics & Boot Logs"
        >
          <Terminal className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onFullscreen}
          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
          title="Toggle Fullscreen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
