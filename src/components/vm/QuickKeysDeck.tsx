import React from "react";
import { SCANCODES } from "../../emulator/clipboard";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CornerDownLeft, Keyboard } from "lucide-react";

interface QuickKeysDeckProps {
  onSendKey: (scancodes: number[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const QuickKeysDeck: React.FC<QuickKeysDeckProps> = ({ onSendKey, isOpen, onToggle }) => {
  return (
    <div className="border-t border-slate-800 bg-slate-950/80 backdrop-blur-sm select-none transition-all duration-200">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800/60">
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium transition"
        >
          <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
          <span>Quick Terminal & BIOS Keys</span>
          <span className="text-[10px] text-slate-400">({isOpen ? "hide" : "show"})</span>
        </button>
      </div>

      {isOpen && (
        <div className="p-2 flex flex-wrap items-center gap-1.5 justify-start text-xs font-mono">
          {/* Signal Shortcuts */}
          <button
            onClick={() => onSendKey(SCANCODES.CTRL_C)}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700/70 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300 text-slate-300 transition"
            title="Interrupt (SIGINT)"
          >
            Ctrl+C
          </button>
          <button
            onClick={() => onSendKey(SCANCODES.CTRL_Z)}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700/70 hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-300 text-slate-300 transition"
            title="Suspend (SIGTSTP)"
          >
            Ctrl+Z
          </button>
          <button
            onClick={() => onSendKey(SCANCODES.CTRL_D)}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700/70 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300 text-slate-300 transition"
            title="End of File / Logout"
          >
            Ctrl+D
          </button>
          <button
            onClick={() => onSendKey(SCANCODES.CTRL_L)}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700/70 hover:border-slate-500 hover:bg-slate-800 text-slate-300 transition"
            title="Clear Screen"
          >
            Ctrl+L
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          {/* Navigation & Controls */}
          <button
            onClick={() => onSendKey(SCANCODES.TAB)}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700/70 hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-300 text-slate-300 transition"
            title="Tab Autocomplete"
          >
            Tab
          </button>
          <button
            onClick={() => onSendKey(SCANCODES.ESC)}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700/70 hover:border-slate-500 hover:bg-slate-800 text-slate-300 transition"
            title="Escape"
          >
            Esc
          </button>
          <button
            onClick={() => onSendKey(SCANCODES.ENTER)}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-700/70 hover:border-slate-500 hover:bg-slate-800 text-slate-300 flex items-center gap-1 transition"
            title="Enter"
          >
            <CornerDownLeft className="w-3 h-3" />
            <span>Enter</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          {/* Arrow Keys */}
          <button
            onClick={() => onSendKey(SCANCODES.UP)}
            className="p-1 rounded bg-slate-900 border border-slate-700/70 hover:bg-slate-800 text-slate-300 transition"
            title="Up"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSendKey(SCANCODES.DOWN)}
            className="p-1 rounded bg-slate-900 border border-slate-700/70 hover:bg-slate-800 text-slate-300 transition"
            title="Down"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSendKey(SCANCODES.LEFT)}
            className="p-1 rounded bg-slate-900 border border-slate-700/70 hover:bg-slate-800 text-slate-300 transition"
            title="Left"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSendKey(SCANCODES.RIGHT)}
            className="p-1 rounded bg-slate-900 border border-slate-700/70 hover:bg-slate-800 text-slate-300 transition"
            title="Right"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          {/* Virtual Consoles */}
          <button
            onClick={() => onSendKey(SCANCODES.ALT_F1)}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-700/70 hover:bg-slate-800 text-slate-300 text-[11px] transition"
            title="Switch to TTY 1"
          >
            tty1
          </button>
          <button
            onClick={() => onSendKey(SCANCODES.ALT_F2)}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-700/70 hover:bg-slate-800 text-slate-300 text-[11px] transition"
            title="Switch to TTY 2"
          >
            tty2
          </button>
          <button
            onClick={() => onSendKey(SCANCODES.ALT_F7)}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-700/70 hover:bg-slate-800 text-slate-300 text-[11px] transition"
            title="Switch to X11 Desktop (Alt+F7)"
          >
            X11 (F7)
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-1" />

          {/* Ctrl+Alt+Del */}
          <button
            onClick={() => onSendKey(SCANCODES.CTRL_ALT_DEL)}
            className="px-2.5 py-1 rounded bg-red-950/40 border border-red-800/60 hover:border-red-500 hover:bg-red-900/50 text-red-300 font-semibold transition text-xs"
            title="Send Ctrl + Alt + Delete to Reboot VM"
          >
            Ctrl+Alt+Del
          </button>
        </div>
      )}
    </div>
  );
};
