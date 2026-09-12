import { useState, lazy, Suspense } from "react";
import { Header } from "./components/layout/Header";
import { VMViewport } from "./components/vm/VMViewport";
import { VMToolbar } from "./components/vm/VMToolbar";
import { QuickKeysDeck } from "./components/vm/QuickKeysDeck";
import { useV86 } from "./emulator/useV86";
import { getProfileById } from "./profiles";

const SnapshotModal = lazy(() => import("./components/modals/SnapshotModal").then(m => ({ default: m.SnapshotModal })));
const NetworkModal = lazy(() => import("./components/modals/NetworkModal").then(m => ({ default: m.NetworkModal })));
const PasteModal = lazy(() => import("./components/modals/PasteModal").then(m => ({ default: m.PasteModal })));
const LogsModal = lazy(() => import("./components/modals/LogsModal").then(m => ({ default: m.LogsModal })));
const MountMediaModal = lazy(() => import("./components/modals/MountMediaModal").then(m => ({ default: m.MountMediaModal })));
import { sanitizeFilename, MAX_GUEST_FILE_SIZE } from "./emulator/security";
import type { VMProfile } from "./emulator/types";

type VM = ReturnType<typeof useV86>;
type Modal = "snapshots" | "network" | "paste" | "upload" | "logs" | "mount" | null;

function Workspace({
  vm,
  crt,
  toggleCrt,
  open,
}: {
  vm: VM;
  crt: boolean;
  toggleCrt: () => void;
  open: (modal: Modal) => void;
}) {
  const [keysOpen, setKeysOpen] = useState(true);
  const start = () => {
    void vm.startVM();
  };

  return (
    <>
      <VMToolbar
        status={vm.status}
        crtEnabled={crt}
        onToggleCrt={toggleCrt}
        onStart={start}
        onPause={vm.pauseVM}
        onResume={vm.resumeVM}
        onRestart={vm.restartVM}
        onResetClean={() => {
          if (confirm("Reset this VM? Unsaved changes will be lost.")) void vm.resetFactoryClean();
        }}
        onFullscreen={() => {
          const target = vm.containerRef.current;
          if (!target?.requestFullscreen) return;
          void (document.fullscreenElement ? document.exitFullscreen() : target.requestFullscreen()).catch(console.warn);
        }}
        onScreenshot={() => {
          const url = vm.takeScreenshot();
          if (!url) { alert("Could not capture this VM screen."); return; }
          const link = document.createElement("a");
          link.href = url;
          link.download = `${vm.profile.id}_${Date.now()}.png`;
          link.click();
        }}
        onOpenPasteModal={() => open("paste")}
        onOpenFileUpload={() => open("upload")}
        onOpenLogsModal={() => open("logs")}
      />
      <VMViewport
        containerRef={vm.containerRef}
        status={vm.status}
        profile={vm.profile}
        error={vm.error}
        crtEnabled={crt}
        onStart={start}
        onFileDrop={async (file) => {
          try {
            if (file.size === 0) throw new Error("Dropped file is empty.");
            if (file.size > MAX_GUEST_FILE_SIZE) {
              throw new Error(`File size exceeds maximum allowed upload limit (${MAX_GUEST_FILE_SIZE / (1024 * 1024)} MB).`);
            }
            const safeName = sanitizeFilename(file.name);
            const targetDir = (vm.profile.sharedDirectory || "/root").replace(/\/+$/, "");
            await vm.uploadGuestFile(`${targetDir}/${safeName}`, new Uint8Array(await file.arrayBuffer()));
            alert(`Copied ${safeName} to ${targetDir}/.`);
          } catch (error) {
            alert(String(error));
          }
        }}
      />
      <QuickKeysDeck
        isOpen={keysOpen}
        onToggle={() => setKeysOpen(!keysOpen)}
        onSendKey={vm.sendKey}
        onFocusTerminal={() => vm.containerRef.current?.focus()}
      />
    </>
  );
}

export default function App() {
  const [initialProfile] = useState(() =>
    getProfileById(new URLSearchParams(location.search).get("profile") || "micro-sandbox")
  );
  const primary = useV86({ initialProfile });
  const secondary = useV86({ initialProfile: getProfileById("micro-sandbox") });
  const [dual, setDual] = useState(false);
  const [active, setActive] = useState(0);
  const [crt, setCrt] = useState(false);
  const [modal, setModal] = useState<Modal>(null);

  const vm = active === 1 && dual ? secondary : primary;

  const selectProfile = (profile: VMProfile) => {
    if (
      ["running", "paused"].includes(vm.status) &&
      !confirm("Switch OS? Unsaved changes in this station will be lost.")
    ) {
      return;
    }
    void vm.switchProfile(profile);
    if (active === 0) {
      const url = new URL(location.href);
      url.searchParams.set("profile", profile.id);
      history.replaceState({}, "", url);
    }
  };

  return (
    <div className="flex flex-col h-dvh w-full overflow-hidden bg-[#090b10] text-slate-200">
      <Header
        currentProfile={vm.profile}
        status={vm.status}
        stats={vm.stats}
        onSelectProfile={selectProfile}
        onOpenSnapshots={() => setModal("snapshots")}
        onOpenNetwork={() => setModal("network")}
        onOpenMountMedia={() => setModal("mount")}
        isDualLab={dual}
        onToggleDualLab={() => {
          if (dual) {
            void secondary.pauseVM();
            setActive(0);
          }
          setDual(!dual);
        }}
        activeStation={active}
        onSelectStation={setActive}
      />
      <main className="flex-1 flex flex-col md:flex-row min-h-0 min-w-0">
        {[primary, secondary].map((station, index) => (
          <section
            key={index}
            hidden={index === 1 && !dual}
            className={`${index === 1 && !dual ? "hidden" : "flex"} flex-1 flex-col min-h-0 min-w-0 transition-all ${
              dual && active === index ? "ring-1 ring-cyan-500/50" : ""
            }`}
            onPointerDownCapture={() => setActive(index)}
            onFocusCapture={() => setActive(index)}
          >
            {dual && (
              <button
                onClick={() => setActive(index)}
                aria-pressed={active === index}
                className={`shrink-0 px-3 py-2 text-left text-xs border-b flex items-center justify-between transition ${
                  active === index
                    ? "bg-cyan-950/80 text-cyan-200 border-b-cyan-500/50"
                    : "bg-slate-900 text-slate-400 border-b-slate-800 hover:bg-slate-850"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      active === index ? "bg-cyan-400 animate-pulse" : "bg-slate-600"
                    }`}
                  />
                  <span className="font-bold">Station {index + 1}:</span>
                  <span>{station.profile.name}</span>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {station.status}
                  {active === index ? " · Active" : ""}
                </span>
              </button>
            )}
            <Workspace
              vm={station}
              crt={crt}
              toggleCrt={() => setCrt(!crt)}
              open={setModal}
            />
          </section>
        ))}
      </main>
      <Suspense fallback={null}>
        {modal === "snapshots" && (
          <SnapshotModal
            isOpen
            onClose={() => setModal(null)}
            status={vm.status}
            currentProfileId={vm.profile.id}
            currentProfileName={vm.profile.name}
            onSaveSnapshot={vm.saveVMSnapshot}
            onRestoreSnapshot={vm.restoreVMSnapshot}
          />
        )}
        {modal === "network" && (
          <NetworkModal
            isOpen
            onClose={() => setModal(null)}
            config={vm.networkConfig}
            stats={vm.stats}
            onUpdateConfig={vm.setNetworkConfig}
          />
        )}
        {(modal === "paste" || modal === "upload") && (
          <PasteModal
            isOpen
            onClose={() => setModal(null)}
            initialTab={modal}
            guestDirectory={vm.profile.sharedDirectory || "/root"}
            supportsFiles={!!vm.profile.filesystem}
            onSendText={vm.sendCommandText}
            onUploadFile={vm.uploadGuestFile}
          />
        )}
        {modal === "logs" && (
          <LogsModal
            isOpen
            onClose={() => setModal(null)}
            logs={vm.serialLogs}
            onClear={vm.clearSerialLogs}
          />
        )}
        {modal === "mount" && (
          <MountMediaModal
            isOpen
            onClose={() => setModal(null)}
            onBootCustomProfile={(profile) => {
              void vm.switchProfile(profile);
            }}
          />
        )}
      </Suspense>
    </div>
  );
}
