import React from "react";
import { VMViewport } from "../vm/VMViewport";
import { VMToolbar } from "../vm/VMToolbar";
import { QuickKeysDeck } from "../vm/QuickKeysDeck";
import { useV86 } from "../../emulator/useV86";
import { getProfileById, PROFILES } from "../../profiles";
import { Shield, Target, ChevronDown } from "lucide-react";


interface DualLabLayoutProps {
  crtEnabled: boolean;
  onToggleCrt: () => void;
  onOpenSnapshots: () => void;
  onOpenNetwork: () => void;
}

export const DualLabLayout: React.FC<DualLabLayoutProps> = ({
  crtEnabled,
  onToggleCrt,
}) => {
  // Primary (Attacker: Kali or Arch)
  const kaliProfile = getProfileById("kali-cli");
  const vm1 = useV86({
    initialProfile: kaliProfile,
    initialNetwork: { mode: "inbrowser", channelName: "webos-lab-mesh" },
  });

  // Secondary (Target: Micro Sandbox or Arch)
  const targetProfile = getProfileById("micro-sandbox");
  const vm2 = useV86({
    initialProfile: targetProfile,
    initialNetwork: { mode: "inbrowser", channelName: "webos-lab-mesh" },
  });

  const [keysOpen1, setKeysOpen1] = React.useState(false);
  const [keysOpen2, setKeysOpen2] = React.useState(false);

  const [selectOpen1, setSelectOpen1] = React.useState(false);
  const [selectOpen2, setSelectOpen2] = React.useState(false);

  const handleFileDrop = (vm: ReturnType<typeof useV86>) => async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      await vm.uploadGuestFile(`/root/${file.name}`, new Uint8Array(buffer));
      alert(`Uploaded ${file.name} to /root/ in VM`);
    } catch (e) {
      alert("Drop file error: " + e);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row w-full h-full divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-slate-950 overflow-hidden">
      {/* Pane 1: Attacker Station */}
      <div className="flex-1 flex flex-col min-w-0 h-1/2 md:h-full">
        {/* Pane Header */}
        <div className="h-9 px-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-100">Lab Station 1: Attacker</span>
            <div className="relative">
              <button
                onClick={() => setSelectOpen1(!selectOpen1)}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 bg-slate-800 px-2 py-0.5 rounded"
              >
                <span>{vm1.profile.name}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {selectOpen1 && (
                <div className="absolute left-0 top-full mt-1 w-56 rounded bg-slate-900 border border-slate-700 shadow-xl p-1 z-50">
                  {PROFILES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        vm1.switchProfile(p);
                        setSelectOpen1(false);
                      }}
                      className="w-full text-left px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 rounded"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <span className="text-[10px] font-mono text-cyan-400">Mesh: webos-lab-mesh</span>
        </div>

        <VMToolbar
          status={vm1.status}
          crtEnabled={crtEnabled}
          onToggleCrt={onToggleCrt}
          onStart={() => vm1.startVM()}
          onPause={() => vm1.pauseVM()}
          onResume={() => vm1.resumeVM()}
          onRestart={() => vm1.restartVM()}
          onResetClean={() => vm1.resetFactoryClean()}
          onFullscreen={() => vm1.containerRef.current?.requestFullscreen()}
          onScreenshot={() => {
            const data = vm1.takeScreenshot();
            if (data) {
              const a = document.createElement("a");
              a.href = data;
              a.download = `attacker_${Date.now()}.png`;
              a.click();
            }
          }}
          onOpenPasteModal={() => {
            const cmd = prompt("Enter command to type into Station 1:");
            if (cmd) vm1.sendCommandText(cmd + "\n");
          }}
          onOpenFileUpload={() => alert("Drag and drop any file directly onto the screen")}
          onOpenLogsModal={() => alert("Serial logs: " + (vm1.serialLogs || "None yet"))}
        />

        <VMViewport
          containerRef={vm1.containerRef}
          status={vm1.status}
          profile={vm1.profile}
          error={vm1.error}
          crtEnabled={crtEnabled}
          onStart={() => vm1.startVM()}
          onFileDrop={handleFileDrop(vm1)}
        />

        <QuickKeysDeck
          isOpen={keysOpen1}
          onToggle={() => setKeysOpen1(!keysOpen1)}
          onSendKey={vm1.sendKey}
        />
      </div>

      {/* Pane 2: Target Station */}
      <div className="flex-1 flex flex-col min-w-0 h-1/2 md:h-full">
        {/* Pane Header */}
        <div className="h-9 px-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-100">Lab Station 2: Target VM</span>
            <div className="relative">
              <button
                onClick={() => setSelectOpen2(!selectOpen2)}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 bg-slate-800 px-2 py-0.5 rounded"
              >
                <span>{vm2.profile.name}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {selectOpen2 && (
                <div className="absolute left-0 top-full mt-1 w-56 rounded bg-slate-900 border border-slate-700 shadow-xl p-1 z-50">
                  {PROFILES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        vm2.switchProfile(p);
                        setSelectOpen2(false);
                      }}
                      className="w-full text-left px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 rounded"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-400">Mesh: webos-lab-mesh</span>
        </div>

        <VMToolbar
          status={vm2.status}
          crtEnabled={crtEnabled}
          onToggleCrt={onToggleCrt}
          onStart={() => vm2.startVM()}
          onPause={() => vm2.pauseVM()}
          onResume={() => vm2.resumeVM()}
          onRestart={() => vm2.restartVM()}
          onResetClean={() => vm2.resetFactoryClean()}
          onFullscreen={() => vm2.containerRef.current?.requestFullscreen()}
          onScreenshot={() => {
            const data = vm2.takeScreenshot();
            if (data) {
              const a = document.createElement("a");
              a.href = data;
              a.download = `target_${Date.now()}.png`;
              a.click();
            }
          }}
          onOpenPasteModal={() => {
            const cmd = prompt("Enter command to type into Station 2:");
            if (cmd) vm2.sendCommandText(cmd + "\n");
          }}
          onOpenFileUpload={() => alert("Drag and drop any file directly onto the screen")}
          onOpenLogsModal={() => alert("Serial logs: " + (vm2.serialLogs || "None yet"))}
        />

        <VMViewport
          containerRef={vm2.containerRef}
          status={vm2.status}
          profile={vm2.profile}
          error={vm2.error}
          crtEnabled={crtEnabled}
          onStart={() => vm2.startVM()}
          onFileDrop={handleFileDrop(vm2)}
        />

        <QuickKeysDeck
          isOpen={keysOpen2}
          onToggle={() => setKeysOpen2(!keysOpen2)}
          onSendKey={vm2.sendKey}
        />
      </div>
    </div>
  );
};
