import wasmUrl from "v86/build/v86.wasm?url";
import { Machine, type Emulator, type MachineState } from "../emulator/machine.ts";
import { createScreen, naturalSize, type ScreenElements } from "../emulator/screen.ts";
import type { V86Block } from "../lib/v86-block.ts";

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id}`);
  return found as T;
}

const blockData = document.getElementById("exhibit-v86");
const section = document.querySelector<HTMLElement>(".exhibit-screen");
if (blockData && section) {
  const block = JSON.parse(blockData.textContent ?? "{}") as V86Block;
  const estimateMB = Number(section.dataset.estimateMb);
  const base = section.dataset.base ?? "/";
  const area = element("screen-area");
  const poster = element("poster");
  const live = element("live");
  const toolbar = element("machine-toolbar");
  const progressBar = element("progress-bar");
  const downloaded = element("downloaded");
  const dialog = element<HTMLDialogElement>("error-dialog");
  const errorStop = element<HTMLButtonElement>("error-stop");
  const bootButton = element<HTMLButtonElement>("boot");
  const noWasm = element("no-wasm");
  let screen: ScreenElements = createScreen(document);

  const fit = () => {
    const fullscreen = document.fullscreenElement === screen.container;
    const rect = area.getBoundingClientRect();
    const size = fullscreen ? { width: innerWidth, height: innerHeight } : { width: rect.width, height: rect.height };
    machine.fit(size, naturalSize(screen.canvas));
  };

  const render = (state: MachineState) => {
    if (state.kind === "error" && state.error === "no-wasm") {
      bootButton.hidden = true;
      noWasm.hidden = false;
      return;
    }
    const active = state.kind !== "idle";
    poster.hidden = active;
    live.hidden = !active;
    toolbar.hidden = !active;
    if (state.kind === "idle") {
      screen.container.remove();
      if (dialog.open) dialog.close();
      return;
    }
    downloaded.textContent = `${Math.round(state.downloadedMB)} MB downloaded`;
    progressBar.style.width = `${Math.min(100, (state.downloadedMB / estimateMB) * 100)}%`;
    if (state.kind === "error") {
      errorStop.hidden = state.error !== "stalled";
      if (!dialog.open) dialog.showModal();
    }
  };

  const machine = new Machine({
    create: async (options) => {
      const { V86 } = await import("v86");
      return new V86(options as ConstructorParameters<typeof V86>[0]) as unknown as Emulator;
    },
    hasWebAssembly: () => typeof WebAssembly === "object",
    devicePixelRatio: () => window.devicePixelRatio || 1,
    now: () => Date.now(),
    every: (ms, fn) => {
      const id = setInterval(fn, ms);
      return () => clearInterval(id);
    },
    onState: render,
    onScreenSizeChange: () => requestAnimationFrame(fit),
  });

  const boot = async () => {
    if (dialog.open) dialog.close();
    screen.container.remove();
    screen = createScreen(document);
    live.append(screen.container);
    await machine.boot(
      block,
      { wasmUrl, biosUrl: `${base}bios/seabios.bin`, vgaBiosUrl: `${base}bios/vgabios.bin`, imageBase: `${base}images/` },
      screen.container,
    );
  };

  bootButton.addEventListener("click", () => void boot());
  element("retry").addEventListener("click", () => void boot());
  element("restart").addEventListener("click", () => void boot());
  element("stop").addEventListener("click", () => void machine.stop());
  errorStop.addEventListener("click", () => void machine.stop());
  element("fullscreen").addEventListener("click", () => machine.fullscreen());
  element("capture").addEventListener("click", () => machine.captureMouse());
  element("ctrl-alt-del").addEventListener("click", () => machine.ctrlAltDel());
  live.addEventListener("click", () => machine.captureMouse());
  new ResizeObserver(() => fit()).observe(area);
  document.addEventListener("fullscreenchange", () => requestAnimationFrame(fit));
  addEventListener("pagehide", () => void machine.stop());
}
