import React from "react";
import {
  Terminal,
  Monitor,
  Activity,
  Cpu,
  Layers,
  Save,
  Radio,
  SplitSquareVertical,
  ChevronDown,
  Disc,
} from "lucide-react";

import type { VMProfile, VMStatus, VMStats } from "../../emulator/types";
import { PROFILES } from "../../profiles";

interface HeaderProps {
  currentProfile: VMProfile;
  status: VMStatus;
  stats: VMStats;
  onSelectProfile: (profile: VMProfile) => void;
  onOpenSnapshots: () => void;
  onOpenNetwork: () => void;
  onOpenMountMedia: () => void;
  onToggleDualLab: () => void;
  isDualLab: boolean;
}


export const Header: React.FC<HeaderProps> = ({
  currentProfile,
  status,
  stats,
  onSelectProfile,
  onOpenSnapshots,
  onOpenNetwork,
  onOpenMountMedia,
  onToggleDualLab,
  isDualLab,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const getStatusBadge = () => {
    switch (status) {
      case "running":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Running
          </span>
        );
      case "booting":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            Booting...
          </span>
        );
      case "paused":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            Paused
          </span>
        );
      case "saving":
      case "restoring":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse">
            State Sync...
          </span>
        );
      case "error":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Error
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            Ready
          </span>
        );
    }
  };

  return (
    <header className="h-14 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-4 flex items-center justify-between z-30 select-none">
      {/* Brand & Distro Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 font-bold text-slate-100 tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm leading-tight flex items-center gap-1.5 font-semibold text-white">
              Browser Linux Lab
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">v86</span>
            </div>
            <div className="text-[10px] text-slate-400 leading-tight">Client-Side x86 Emulation</div>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-slate-800 hidden sm:block" />

        {/* Profile Switcher */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-700/60 hover:border-cyan-500/50 hover:bg-slate-850 transition text-xs font-medium text-slate-200 shadow-sm"
          >
            {currentProfile.mode === "gui" ? (
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="font-semibold text-slate-100">{currentProfile.name}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-2 w-72 rounded-lg bg-slate-900 border border-slate-800 shadow-2xl p-1 z-50 divide-y divide-slate-800/60">
              <div className="py-1">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Select OS Profile
                </div>
                {PROFILES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectProfile(p);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-md transition flex items-start gap-2.5 group ${
                      p.id === currentProfile.id
                        ? "bg-cyan-950/40 text-cyan-300 border border-cyan-800/30"
                        : "hover:bg-slate-800/60 text-slate-300 hover:text-white"
                    }`}
                  >
                    <div className="mt-0.5">
                      {p.mode === "gui" ? (
                        <Monitor className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <Terminal className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold truncate">{p.name}</span>
                        {p.recommended && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                            Fast
                          </span>
                        )}
                        {p.isExperimental && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300">
                            Beta
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{p.tagline}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {getStatusBadge()}
      </div>

      {/* Center / System Telemetry */}
      <div className="hidden md:flex items-center gap-4 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-1.5" title="CPU Instruction Execution Speed">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>{stats.mips} MIPS</span>
        </div>
        <div className="flex items-center gap-1.5" title="Allocated RAM">
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          <span>{stats.memoryMB} MB RAM</span>
        </div>
        <div className="flex items-center gap-1.5" title="Uptime">
          <span className="text-slate-500">UP:</span>
          <span>
            {Math.floor(stats.uptimeSeconds / 60)}m {stats.uptimeSeconds % 60}s
          </span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleDualLab}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition ${
            isDualLab
              ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-500/20"
              : "bg-slate-900 border-slate-700/60 hover:bg-slate-800 text-slate-300 hover:text-white"
          }`}
          title="Toggle Cyber Training Split-Screen (Kali vs Target VM)"
        >
          <SplitSquareVertical className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Cyber Lab Mode</span>
        </button>

        <button
          onClick={onOpenMountMedia}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-700/60 hover:border-cyan-500/50 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white transition"
          title="Mount Custom ISO or Disk Image"
        >
          <Disc className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Mount ISO</span>
        </button>

        <button
          onClick={onOpenNetwork}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-700/60 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white transition"
          title="Configure Virtual Network & Mesh"
        >
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Network</span>
        </button>

        <button
          onClick={onOpenSnapshots}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-700/60 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white transition"
          title="IndexedDB Snapshots & State Restores"
        >
          <Save className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Snapshots</span>
        </button>
      </div>
    </header>
  );
};

