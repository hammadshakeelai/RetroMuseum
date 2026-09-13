import type { V86Block } from "../lib/v86-block.ts";
import { DownloadMeter, StallWatch } from "./downloads.ts";
import { fitScale, type Size } from "./fit.ts";

export type MachineError = "download" | "stalled" | "no-wasm";

export type MachineState =
  | { kind: "idle" }
  | { kind: "running"; downloadedMB: number }
  | { kind: "error"; error: MachineError; downloadedMB: number };

export interface DownloadProgress {
  file_name: string;
  loaded: number;
  total: number;
  lengthComputable: boolean;
}

/** The part of v86's V86 class the machine uses. */
export interface Emulator {
  add_listener(event: "download-progress", listener: (progress: DownloadProgress) => void): void;
  add_listener(event: "download-error" | "screen-set-size", listener: () => void): void;
  screen_set_scale(sx: number, sy: number): void;
  screen_go_fullscreen(): void;
  lock_mouse(): void;
  keyboard_send_scancodes(codes: number[]): void;
  destroy(): Promise<void>;
}

export interface Runtime {
  wasmUrl: string;
  biosUrl: string;
  vgaBiosUrl: string;
  /** The site's images/ address, ending in a slash. */
  imageBase: string;
}

export interface MachineDeps {
  create(options: Record<string, unknown>): Promise<Emulator>;
  hasWebAssembly(): boolean;
  devicePixelRatio(): number;
  now(): number;
  /** Calls `fn` every `ms` milliseconds and returns a function that stops it. */
  every(ms: number, fn: () => void): () => void;
  onState(state: MachineState): void;
  /** The guest changed its screen size, so the page should fit the screen again. */
  onScreenSizeChange(): void;
}

/** Ctrl, Alt, Delete, then their break codes (v86 src/browser/main.js). */
export const CTRL_ALT_DEL = [0x1d, 0x38, 0x53, 0x9d, 0xb8, 0xd3];
export const STALL_MS = 60_000;
const STALL_CHECK_MS = 5_000;

/** The exhibit's block with its disk in the site's images folder, plus what the page supplies (spec section 4). */
export function v86Options(block: V86Block, runtime: Runtime, container: HTMLElement): Record<string, unknown> {
  const options: Record<string, unknown> = { ...block };
  for (const key of ["fda", "hda", "cdrom"] as const) {
    const disk = block[key];
    if (disk) options[key] = { ...disk, url: runtime.imageBase + disk.url };
  }
  return {
    ...options,
    wasm_path: runtime.wasmUrl,
    bios: { url: runtime.biosUrl },
    vga_bios: { url: runtime.vgaBiosUrl },
    screen: { container, use_graphical_text: true },
    autostart: true,
  };
}

export class Machine {
  private readonly deps: MachineDeps;
  private emulator: Emulator | null = null;
  private stopTimer: (() => void) | null = null;
  private state: MachineState = { kind: "idle" };
  private meter = new DownloadMeter();
  private stall = new StallWatch(STALL_MS);
  private generation = 0;

  constructor(deps: MachineDeps) {
    this.deps = deps;
  }

  async boot(block: V86Block, runtime: Runtime, container: HTMLElement): Promise<void> {
    await this.teardown();
    const generation = this.generation;
    if (!this.deps.hasWebAssembly()) {
      this.setState({ kind: "error", error: "no-wasm", downloadedMB: 0 });
      return;
    }
    this.meter = new DownloadMeter();
    this.stall = new StallWatch(STALL_MS);
    const emulator = await this.deps.create(v86Options(block, runtime, container));
    if (generation !== this.generation) {
      await emulator.destroy();
      return;
    }
    this.emulator = emulator;
    emulator.add_listener("download-progress", (progress) => {
      this.meter.record(progress.file_name, progress.loaded);
      this.stall.progress(progress.file_name, progress.loaded, progress.total, progress.lengthComputable, this.deps.now());
      if (this.state.kind === "running") this.setState({ kind: "running", downloadedMB: this.meter.megabytes() });
    });
    emulator.add_listener("download-error", () => this.fail("download"));
    emulator.add_listener("screen-set-size", () => this.deps.onScreenSizeChange());
    this.stopTimer = this.deps.every(STALL_CHECK_MS, () => {
      if (this.stall.isStalled(this.deps.now())) this.fail("stalled");
    });
    this.setState({ kind: "running", downloadedMB: 0 });
  }

  async stop(): Promise<void> {
    await this.teardown();
    this.setState({ kind: "idle" });
  }

  /**
   * v86's ScreenAdapter divides the scale by a fractional devicePixelRatio (to keep pixels sharp), and
   * leaves the canvas size alone when the result is exactly 1, so both are undone here.
   */
  fit(area: Size, content: Size): void {
    let scale = fitScale(area, content);
    if (scale === 1) scale += 1e-9;
    const ratio = this.deps.devicePixelRatio();
    if (ratio % 1 !== 0) scale *= ratio;
    this.emulator?.screen_set_scale(scale, scale);
  }

  fullscreen(): void {
    this.emulator?.screen_go_fullscreen();
  }

  captureMouse(): void {
    this.emulator?.lock_mouse();
  }

  ctrlAltDel(): void {
    this.emulator?.keyboard_send_scancodes(CTRL_ALT_DEL);
  }

  private fail(error: MachineError): void {
    if (this.state.kind !== "running") return;
    this.setState({ kind: "error", error, downloadedMB: this.meter.megabytes() });
  }

  private async teardown(): Promise<void> {
    this.generation++;
    this.stopTimer?.();
    this.stopTimer = null;
    const emulator = this.emulator;
    this.emulator = null;
    if (emulator) await emulator.destroy();
  }

  private setState(state: MachineState): void {
    this.state = state;
    this.deps.onState(state);
  }
}
