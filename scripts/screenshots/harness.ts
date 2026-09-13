// Boots one hosted exhibit for scripts/screenshots.ts, and checks screen photos for blank screens.
// Vite serves this page with public/ as its root; it isn't part of the site.
import { V86 } from "v86";
import wasmUrl from "v86/build/v86.wasm?url";
import { isBlank } from "../../src/emulator/blank.ts";
import { Machine, type Emulator, type MachineState } from "../../src/emulator/machine.ts";
import { createScreen } from "../../src/emulator/screen.ts";
import type { V86Block } from "../../src/lib/v86-block.ts";

export interface Harness {
  boot(block: V86Block): Promise<void>;
  /** The machine's error, or null. */
  error(): string | null;
  isBlankPng(base64: string): Promise<boolean>;
}

declare global {
  interface Window {
    harness: Harness;
  }
}

let state: MachineState = { kind: "idle" };
const screen = createScreen(document);
document.getElementById("screen")?.append(screen.container);

const machine = new Machine({
  create: async (options) => new V86(options as ConstructorParameters<typeof V86>[0]) as unknown as Emulator,
  hasWebAssembly: () => typeof WebAssembly === "object",
  devicePixelRatio: () => window.devicePixelRatio || 1,
  now: () => Date.now(),
  every: (ms, fn) => {
    const id = setInterval(fn, ms);
    return () => clearInterval(id);
  },
  onState: (next) => {
    state = next;
  },
  onScreenSizeChange: () => {},
});

window.harness = {
  boot: (block) =>
    machine.boot(
      block,
      { wasmUrl, biosUrl: "/bios/seabios.bin", vgaBiosUrl: "/bios/vgabios.bin", imageBase: "/images/" },
      screen.container,
    ),
  error: () => (state.kind === "error" ? state.error : null),
  isBlankPng: async (base64) => {
    const response = await fetch(`data:image/png;base64,${base64}`);
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    if (!context || bitmap.width === 0 || bitmap.height === 0) return true;
    context.drawImage(bitmap, 0, 0);
    return isBlank(context.getImageData(0, 0, bitmap.width, bitmap.height).data);
  },
};
