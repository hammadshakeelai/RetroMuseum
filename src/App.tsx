import { useState, useEffect } from "react";
import { Header } from "./components/layout/Header";
import { VMViewport } from "./components/vm/VMViewport";
import { VMToolbar } from "./components/vm/VMToolbar";
import { QuickKeysDeck } from "./components/vm/QuickKeysDeck";
import { DualLabLayout } from "./components/layout/DualLabLayout";
import { SnapshotModal } from "./components/modals/SnapshotModal";
import { NetworkModal } from "./components/modals/NetworkModal";
import { PasteModal } from "./components/modals/PasteModal";
import { LogsModal } from "./components/modals/LogsModal";
import { MountMediaModal } from "./components/modals/MountMediaModal";
import { useV86 } from "./emulator/useV86";
import { PROFILES, getProfileById } from "./profiles";
import type { VMProfile } from "./emulator/types";

export function App() {
  // Default to the instant bundled Micro Linux or Arch 32
  const initialProfile = getProfileById("arch-cli");
  const vm = useV86({ initialProfile });

  // UI state
  const [isDualLab, setIsDualLab] = useState(false);
  const [crtEnabled, setCrtEnabled] = useState(false);
  const [keysOpen, setKeysOpen] = useState(true);

  // Modals state
  const [snapshotModalOpen, setSnapshotModalOpen] = useState(false);
  const [networkModalOpen, setNetworkModalOpen] = useState(false);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [mountModalOpen, setMountModalOpen] = useState(false);


  // Parse URL query parameters for shareable URLs: ?profile=arch-cli&mode=gui
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const profileId = params.get("profile");
    if (profileId) {
      const match = PROFILES.find((p) => p.id === profileId);
      if (match) {
        vm.switchProfile(match);
      }
    }
  }, []);

  const handleProfileSelect = (profile: VMProfile) => {
    vm.switchProfile(profile);
    const url = new URL(window.location.href);
    url.searchParams.set("profile", profile.id);
    window.history.replaceState({}, "", url.toString());
  };

  const handleFullscreen = () => {
    if (vm.containerRef.current) {
      if (!document.fullscreenElement) {
        vm.containerRef.current.requestFullscreen().catch(console.warn);
      } else {
        document.exitFullscreen().catch(console.warn);
      }
    }
  };

  const handleScreenshot = () => {
    const dataUrl = vm.takeScreenshot();
    if (dataUrl) {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${vm.profile.id}_screenshot_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert("Screenshot could not be taken. Make sure VM is running.");
    }
  };

  const handleFileDrop = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const dest = `/root/${file.name}`;
      await vm.uploadGuestFile(dest, new Uint8Array(buffer));
      alert(`File "${file.name}" copied into Linux guest at ${dest}`);
    } catch (e) {
      alert("Error uploading dropped file: " + e);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#090b10] text-slate-200">
      {/* Top Application Header */}
      <Header
        currentProfile={vm.profile}
        status={vm.status}
        stats={vm.stats}
        onSelectProfile={handleProfileSelect}
        onOpenSnapshots={() => setSnapshotModalOpen(true)}
        onOpenNetwork={() => setNetworkModalOpen(true)}
        onOpenMountMedia={() => setMountModalOpen(true)}
        onToggleDualLab={() => setIsDualLab(!isDualLab)}
        isDualLab={isDualLab}
      />

      {/* Main Workspace Area */}
      {isDualLab ? (
        <DualLabLayout
          crtEnabled={crtEnabled}
          onToggleCrt={() => setCrtEnabled(!crtEnabled)}
          onOpenSnapshots={() => setSnapshotModalOpen(true)}
          onOpenNetwork={() => setNetworkModalOpen(true)}
        />
      ) : (
        <main className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          {/* Hardware & Playback Toolbar */}
          <VMToolbar
            status={vm.status}
            crtEnabled={crtEnabled}
            onToggleCrt={() => setCrtEnabled(!crtEnabled)}
            onStart={() => vm.startVM()}
            onPause={() => vm.pauseVM()}
            onResume={() => vm.resumeVM()}
            onRestart={() => vm.restartVM()}
            onResetClean={() => vm.resetFactoryClean()}
            onFullscreen={handleFullscreen}
            onScreenshot={handleScreenshot}
            onOpenPasteModal={() => setPasteModalOpen(true)}
            onOpenFileUpload={() => setPasteModalOpen(true)}
            onOpenLogsModal={() => setLogsModalOpen(true)}
          />

          {/* Emulation Viewport (Canvas / VGA) */}
          <VMViewport
            containerRef={vm.containerRef}
            status={vm.status}
            profile={vm.profile}
            error={vm.error}
            crtEnabled={crtEnabled}
            onStart={() => vm.startVM()}
            onFileDrop={handleFileDrop}
          />

          {/* Special Keystroke Dock */}
          <QuickKeysDeck
            isOpen={keysOpen}
            onToggle={() => setKeysOpen(!keysOpen)}
            onSendKey={vm.sendKey}
          />
        </main>
      )}

      {/* Modals & Dialogs */}
      <SnapshotModal
        isOpen={snapshotModalOpen}
        onClose={() => setSnapshotModalOpen(false)}
        status={vm.status}
        currentProfileId={vm.profile.id}
        currentProfileName={vm.profile.name}
        onSaveSnapshot={vm.saveVMSnapshot}
        onRestoreSnapshot={vm.restoreVMSnapshot}
      />

      <NetworkModal
        isOpen={networkModalOpen}
        onClose={() => setNetworkModalOpen(false)}
        config={vm.networkConfig}
        stats={vm.stats}
        onUpdateConfig={vm.setNetworkConfig}
      />

      <PasteModal
        isOpen={pasteModalOpen}
        onClose={() => setPasteModalOpen(false)}
        onSendText={vm.sendCommandText}
        onUploadFile={vm.uploadGuestFile}
      />

      <LogsModal
        isOpen={logsModalOpen}
        onClose={() => setLogsModalOpen(false)}
        logs={vm.serialLogs}
        onClear={vm.clearSerialLogs}
      />

      <MountMediaModal
        isOpen={mountModalOpen}
        onClose={() => setMountModalOpen(false)}
        onBootCustomProfile={(customProfile) => {
          vm.switchProfile(customProfile);
        }}
      />
    </div>
  );
}


export default App;
