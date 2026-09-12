import { Dialog } from "./Dialog";
import React, { useState } from "react";
import { X, Radio, Wifi, Globe, Shield, Activity, RefreshCw } from "lucide-react";
import { validateChannelName, validateRelayUrl } from "../../emulator/security";
import type { NetworkConfig, NetworkMode, VMStats } from "../../emulator/types";

interface NetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: NetworkConfig;
  stats: VMStats;
  onUpdateConfig: (newConfig: NetworkConfig) => void;
}

export const NetworkModal: React.FC<NetworkModalProps> = ({
  isOpen,
  onClose,
  config,
  stats,
  onUpdateConfig,
}) => {
  const [mode, setMode] = useState<NetworkMode>(config.mode);
  const [channelName, setChannelName] = useState(config.channelName || "webos-lab-mesh");
  const [relayUrl, setRelayUrl] = useState(config.relayUrl || "wss://relay.widgetry.org/");

  if (!isOpen) return null;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    let validatedChannel = channelName.trim();
    let validatedRelay = relayUrl.trim();

    if (mode === "inbrowser") {
      try {
        validatedChannel = validateChannelName(channelName);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Enter a valid mesh channel name.");
        return;
      }
    }

    if (mode === "wsproxy") {
      try {
        validatedRelay = validateRelayUrl(relayUrl);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Enter a valid WebSocket URL (wss:// on HTTPS pages).");
        return;
      }
    }

    onUpdateConfig({
      mode,
      channelName: validatedChannel,
      relayUrl: validatedRelay,
    });
    onClose();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <Dialog label="Network" onClose={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">Virtual Network Settings</h2>
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
        <form onSubmit={handleApply} className="p-5 space-y-4">
          <p className="text-xs text-amber-300">Changes apply on the next Power On or Factory Reset. A warm reboot keeps the current network. Mesh peers need distinct static IP addresses on the same subnet.</p>
          {/* Traffic Monitor */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Traffic RX (Received)
                </div>
                <div className="text-xs font-mono text-slate-200 font-bold">
                  {formatBytes(stats.bytesReceived)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Traffic TX (Transmitted)
                </div>
                <div className="text-xs font-mono text-slate-200 font-bold">
                  {formatBytes(stats.bytesSent)}
                </div>
              </div>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Emulation Network Mode</label>

            {/* In-Browser Mesh */}
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                mode === "inbrowser"
                  ? "bg-cyan-950/40 border-cyan-500/60 text-cyan-200"
                  : "bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <input
                type="radio"
                name="network-mode"
                checked={mode === "inbrowser"}
                onChange={() => setMode("inbrowser")}
                className="mt-0.5"
              />
              <div className="flex-1 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                  <span>In-Browser Mesh Lab (BroadcastChannel)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                  Connects virtual machines across tabs or split-screen panes inside the browser. No external internet servers required. Perfect for Kali pen-testing labs.
                </p>
              </div>
            </label>

            {/* Offline */}
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                mode === "offline"
                  ? "bg-cyan-950/40 border-cyan-500/60 text-cyan-200"
                  : "bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <input
                type="radio"
                name="network-mode"
                checked={mode === "offline"}
                onChange={() => setMode("offline")}
                className="mt-0.5"
              />
              <div className="flex-1 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span>Air-Gapped Offline Mode</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                  Disconnects guest network traffic. Remote boot images and streamed files still require an internet connection.
                </p>
              </div>
            </label>

            {/* wsproxy Relay */}
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                mode === "wsproxy"
                  ? "bg-cyan-950/40 border-cyan-500/60 text-cyan-200"
                  : "bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <input
                type="radio"
                name="network-mode"
                checked={mode === "wsproxy"}
                onChange={() => setMode("wsproxy")}
                className="mt-0.5"
              />
              <div className="flex-1 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <Globe className="w-3.5 h-3.5 text-indigo-400" />
                  <span>External WebSocket Relay (wsproxy)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                  Bridges Ethernet packets over WebSocket through a public or local wsproxy relay server to access the live internet.
                </p>
              </div>
            </label>
          </div>

          {/* Conditional Options */}
          {mode === "inbrowser" && (
            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Virtual Broadcast Subnet Channel
              </label>
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="webos-lab-mesh"
                className="w-full bg-slate-950 border border-slate-700/80 rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {mode === "wsproxy" && (
            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                WebSocket Relay Endpoint URL
              </label>
              <input
                type="text"
                value={relayUrl}
                onChange={(e) => setRelayUrl(e.target.value)}
                placeholder="wss://relay.widgetry.org/"
                className="w-full bg-slate-950 border border-slate-700/80 rounded px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              aria-label="Close dialog"
            onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow transition"
            >
              Apply Network Config
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};
