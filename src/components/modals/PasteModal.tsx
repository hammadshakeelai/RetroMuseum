import { Dialog } from "./Dialog";
import React, { useState } from "react";
import { X, ClipboardPaste, Terminal, FileCode, CheckCircle2, Upload } from "lucide-react";
import {
  sanitizeFilename,
  MAX_GUEST_FILE_SIZE,
  MAX_TERMINAL_INPUT_LENGTH,
} from "../../emulator/security";

interface PasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendText: (text: string) => void;
  onUploadFile: (path: string, data: Uint8Array) => Promise<void>;
  guestDirectory: string;
  supportsFiles: boolean;
  initialTab?: "paste" | "upload";
}

export const PasteModal: React.FC<PasteModalProps> = ({
  isOpen,
  onClose,
  onSendText,
  onUploadFile,
  initialTab = "paste",
  guestDirectory,
  supportsFiles,
}) => {
  const [activeTab, setActiveTab] = useState<"paste" | "upload">(initialTab);
  const [text, setText] = useState("");
  const [appendEnter, setAppendEnter] = useState(true);
  const [filePath, setFilePath] = useState(`${guestDirectory}/script.sh`);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePasteExecute = () => {
    if (!text) return;
    if (text.length > MAX_TERMINAL_INPUT_LENGTH) {
      alert(`Text is too large to type as raw keystrokes (> ${MAX_TERMINAL_INPUT_LENGTH / 1024} KB). Please use "Write to File" or "Upload Host File" instead.`);
      return;
    }
    const toSend = appendEnter ? text + "\n" : text;
    onSendText(toSend);
    setSuccessMsg("Keystrokes transmitted to terminal!");
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 800);
  };

  const handleWriteToFile = async () => {
    if (!text || !filePath) return;
    setIsProcessing(true);
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      if (data.byteLength > MAX_GUEST_FILE_SIZE) {
        throw new Error(`File size exceeds maximum allowed upload limit (${MAX_GUEST_FILE_SIZE / (1024 * 1024)} MB).`);
      }
      await onUploadFile(filePath, data);
      setSuccessMsg(`File created at ${filePath}!`);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1000);
    } catch (err) {
      alert("Error saving file: " + err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size === 0) {
        alert("Selected file is empty.");
        return;
      }
      if (file.size > MAX_GUEST_FILE_SIZE) {
        alert(`File size exceeds maximum allowed limit (${MAX_GUEST_FILE_SIZE / (1024 * 1024)} MB).`);
        return;
      }
      let safeName: string;
      try {
        safeName = sanitizeFilename(file.name);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Invalid filename.");
        return;
      }
      setIsProcessing(true);
      try {
        const buffer = await file.arrayBuffer();
        const cleanGuestDir = guestDirectory.replace(/\/+$/, "");
        const dest = `${cleanGuestDir}/${safeName}`;
        await onUploadFile(dest, new Uint8Array(buffer));
        setSuccessMsg(`Uploaded ${safeName} to ${dest}!`);
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 1200);
      } catch (err) {
        alert("Upload error: " + err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <Dialog label="Paste" onClose={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Tabs & Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("paste")}
              className={`flex items-center gap-1.5 py-1 text-xs font-semibold border-b-2 transition ${
                activeTab === "paste"
                  ? "border-cyan-400 text-cyan-300"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <ClipboardPaste className="w-4 h-4" />
              <span>Paste & Execute</span>
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`flex items-center gap-1.5 py-1 text-xs font-semibold border-b-2 transition ${
                activeTab === "upload"
                  ? "border-cyan-400 text-cyan-300"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload Host File</span>
            </button>
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
        <div className="p-5 space-y-4">
          {!supportsFiles && <p className="text-xs text-amber-300">This image has no shared filesystem. Paste commands into the terminal, or choose Micro Linux / Arch for file uploads.</p>}
          {successMsg && (
            <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === "paste" ? (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Command or Script Content
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste bash commands, Python script, or text here..."
                  rows={7}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 placeholder-slate-600 resize-none"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={appendEnter}
                    onChange={(e) => setAppendEnter(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-500"
                  />
                  <span>Automatically press Enter at end</span>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="/root/script.sh"
                    className="w-36 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-slate-300"
                  />
                  <button
                    onClick={handleWriteToFile}
                    disabled={!text || isProcessing || !supportsFiles}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
                    title="Write directly into 9P filesystem"
                  >
                    <FileCode className="w-3.5 h-3.5 text-blue-400" />
                    <span>Write to File</span>
                  </button>
                </div>

                <button
                  onClick={handlePasteExecute}
                  disabled={!text || isProcessing}
                  className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition"
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Type into Terminal</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4 py-2">
              <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/40">
                <Upload className="w-10 h-10 text-cyan-400 mb-2" />
                <span className="text-xs font-semibold text-slate-200">
                  Select file from host machine
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Will be uploaded into <code className="font-mono text-cyan-300">{guestDirectory}/</code>
                </span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={isProcessing || !supportsFiles}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
};
