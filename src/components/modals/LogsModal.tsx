import { Dialog } from "./Dialog";
import React from "react";
import { X, Terminal, Trash2, Download } from "lucide-react";

interface LogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: string;
  onClear: () => void;
}

export const LogsModal: React.FC<LogsModalProps> = ({ isOpen, onClose, logs, onClear }) => {
  if (!isOpen) return null;

  const handleDownload = () => {
    const blob = new Blob([logs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `serial_boot_${Date.now()}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog label="Logs" onClose={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              Serial Console & Boot Diagnostics
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={!logs}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
              title="Download Log as .txt"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClear}
              disabled={!logs}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition"
              title="Clear Logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              aria-label="Close dialog"
            onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto bg-slate-950 font-mono text-xs text-slate-300">
          {logs ? (
            <pre className="whitespace-pre-wrap leading-relaxed select-text">{logs}</pre>
          ) : (
            <div className="text-center text-slate-500 py-12">
              No serial console output captured yet. Serial logs appear when the guest kernel prints to ttyS0.
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};
