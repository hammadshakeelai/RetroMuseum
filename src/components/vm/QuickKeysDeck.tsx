import React from "react";
import { SCANCODES } from "../../emulator/clipboard";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CornerDownLeft,
  Keyboard,
  Delete,
  ChevronsUp,
  ChevronsDown,
  Terminal,
} from "lucide-react";

interface QuickKeysDeckProps {
  onSendKey: (scancodes: number[]) => void;
  isOpen: boolean;
  onToggle: () => void;
  onFocusTerminal?: () => void;
}

export const QuickKeysDeck: React.FC<QuickKeysDeckProps> = ({
  onSendKey,
  isOpen,
  onToggle,
  onFocusTerminal,
}) => {
  const preventBlur = (e: React.MouseEvent) => e.preventDefault();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && onFocusTerminal) {
      e.preventDefault();
      onFocusTerminal();
    }
  };

  return (
    <div
      className="border-t border-slate-800 bg-slate-950/80 backdrop-blur-sm select-none transition-all duration-200"
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800/60">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls="quick-keys-panel"
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium transition focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
        >
          <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
          <span>Quick Terminal & BIOS Keys</span>
          <span className="text-[10px] text-slate-400">({isOpen ? "hide" : "show"})</span>
        </button>

        {onFocusTerminal && (
          <button
            type="button"
            onClick={onFocusTerminal}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 hover:border-cyan-500/50 hover:bg-slate-800 text-cyan-300 text-[11px] font-medium transition focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            title="Return keyboard focus to Linux terminal (or press Esc)"
            aria-label="Return focus to terminal screen"
          >
            <Terminal className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Focus Terminal</span>
            <span className="text-[10px] text-cyan-400/70 font-mono sm:inline hidden">(Esc)</span>
          </button>
        )}
      </div>

      {isOpen && (
        <div
          id="quick-keys-panel"
          role="region"
          aria-label="Virtual keyboard and terminal keys"
          className="p-2 flex flex-wrap items-center gap-1.5 justify-start text-xs font-mono"
        >
          {/* Signal Shortcuts */}
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => onSendKey(SCANCODES.CTRL_C)}
            aria-label="Send Ctrl+C interrupt (SIGINT)"
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700/70 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300 text-slate-300 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            title="Interrupt (SIGINT)"
          >
            Ctrl+C
          </button>
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => onSendKey(SCANCODES.CTRL_Z)}
            aria-label="Send Ctrl+Z suspend (SIGTSTP)"
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700/70 hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-300 text-slate-300 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            title="Suspend (SIGTSTP)"
          >
            Ctrl+Z
          </button>
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => onSendKey(SCANCODES.CTRL_D)}
            aria-label="Send Ctrl+D end of file or logout"
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700/70 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300 text-slate-300 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            title="End of File / Logout"
          >
            Ctrl+D
          </button>
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => onSendKey(SCANCODES.CTRL_L)}
            aria-label="Send Ctrl+L clear screen"
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700/70 hover:border-slate-500 hover:bg-slate-800 text-slate-300 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            title="Clear Screen"
          >
            Ctrl+L
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-1" aria-hidden="true" />

          {/* Navigation & Controls */}
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => onSendKey(SCANCODES.TAB)}
            aria-label="Send Tab key"
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700/70 hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-300 text-slate-300 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            title="Tab Autocomplete"
          >
            Tab
          </button>
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => onSendKey(SCANCODES.ESC)}
            aria-label="Send Escape key"
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700/70 hover:border-slate-500 hover:bg-slate-800 text-slate-300 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            title="Escape"
          >
            Esc
          </button>
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => onSendKey(SCANCODES.BACKSPACE)}
            aria-label="Send Backspace key"
            className="px-2 py-1 rounded bg-slate-900 border border-slate-700/70 hover:border-slate-500 hover:bg-slate-800 text-slate-300 flex items-center gap-1 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            title="Backspace"
          >
            <Delete className="w-3 h-3 text-slate-400" />
            <span>Bksp</span>
          </button>
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => onSendKey(SCANCODES.ENTER)}
            aria-label="Send Enter key"
            className="px-2 py-1 rounded bg-slate-900 border border-slate-700/70 hover:border-slate-500 hover:bg-slate-800 text-slate-300 flex items-center gap-1 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            title="Enter"
          >
            <CornerDownLeft className="w-3 h-3" />
            <span>Enter</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-1" aria-hidden="true" />

          {/* Arrow Keys */}
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => onSendKey(SCANCODES.UP)}
            aria-label="Send Up arrow key"
            className="p-1 rounded bg-slate-900 border border-slate-700/70 hover:bg-slate-800 text-slate-300 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            title="Up"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => onSendKey(SCANCODES.DOWN)}
            aria-label="Send Down arrow key"
            className="p-1 rounded bg-slate-900 border border-slate-700/70 hover:bg-slate-800 text-slate-300 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            title="Down"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => onSendKey(SCANCODES.LEFT)}
            aria-label="Send Left arrow key"
            className="p-1 rounded bg-slate-900 border border-slate-700/70 hover:bg-slate-800 text-slate-300 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            title="Left"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => onSendKey(SCANCODES.RIGHT)}
            aria-label="Send Right arrow key"
            className="p-1 rounded bg-slate-900 border border-slate-700/70 hover:bg-slate-800 text-slate-300 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            title="Right"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => onSendKey(SCANCODES.PAGE_UP)}
            aria-label="Send Page Up key"
            className="p-1 rounded bg-slate-900 border border-slate-700/70 hover:bg-slate-800 text-slate-300 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            title="Page Up"
          >
            <ChevronsUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => onSendKey(SCANCODES.PAGE_DOWN)}
            aria-label="Send Page Down key"
            className="p-1 rounded bg-slate-900 border border-slate-700/70 hover:bg-slate-800 text-slate-300 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            title="Page Down"
          >
            <ChevronsDown className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-1" aria-hidden="true" />

          {/* Virtual Consoles */}
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => onSendKey(SCANCODES.ALT_F1)}
            aria-label="Switch to TTY 1 console (Alt+F1)"
            className="px-2 py-1 rounded bg-slate-900 border border-slate-700/70 hover:bg-slate-800 text-slate-300 text-[11px] transition focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            title="Switch to TTY 1"
          >
            tty1
          </button>
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => onSendKey(SCANCODES.ALT_F2)}
            aria-label="Switch to TTY 2 console (Alt+F2)"
            className="px-2 py-1 rounded bg-slate-900 border border-slate-700/70 hover:bg-slate-800 text-slate-300 text-[11px] transition focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            title="Switch to TTY 2"
          >
            tty2
          </button>
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => onSendKey(SCANCODES.ALT_F7)}
            aria-label="Switch to X11 GUI desktop (Alt+F7)"
            className="px-2 py-1 rounded bg-slate-900 border border-slate-700/70 hover:bg-slate-800 text-slate-300 text-[11px] transition focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
            title="Switch to X11 Desktop (Alt+F7)"
          >
            X11 (F7)
          </button>

          <div className="h-4 w-[1px] bg-slate-800 mx-1" aria-hidden="true" />

          {/* Ctrl+Alt+Del */}
          <button
            type="button"
            onMouseDown={preventBlur}
            onClick={() => onSendKey(SCANCODES.CTRL_ALT_DEL)}
            aria-label="Send Ctrl+Alt+Delete to reboot VM"
            className="px-2.5 py-1 rounded bg-red-950/40 border border-red-800/60 hover:border-red-500 hover:bg-red-900/50 text-red-300 font-semibold transition text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
            title="Send Ctrl + Alt + Delete to Reboot VM"
          >
            Ctrl+Alt+Del
          </button>
        </div>
      )}
    </div>
  );
};
