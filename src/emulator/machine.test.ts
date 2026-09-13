import { describe, expect, it, vi } from "vitest";
import type { V86Block } from "../lib/v86-block.ts";
import { CTRL_ALT_DEL, Machine, type Emulator, type MachineState } from "./machine.ts";

const MB = 1024 * 1024;
const block: V86Block = { fda: { url: "tetros.img", size: 512 } };
const runtime = {
  wasmUrl: "/v86.wasm",
  biosUrl: "/bios/seabios.bin",
  vgaBiosUrl: "/bios/vgabios.bin",
  imageBase: "/RetroMuseum/images/",
};
const container = {} as unknown as HTMLElement;

class FakeEmulator implements Emulator {
  listeners = new Map<string, (argument?: unknown) => void>();
  scale: [number, number] | null = null;
  scancodes: number[] = [];
  destroyed = false;

  add_listener(event: string, listener: (argument: never) => void): void {
    this.listeners.set(event, listener as (argument?: unknown) => void);
  }

  emit(event: string, argument?: unknown): void {
    this.listeners.get(event)?.(argument);
  }

  screen_set_scale(sx: number, sy: number): void {
    this.scale = [sx, sy];
  }

  screen_go_fullscreen(): void {}

  lock_mouse(): void {}

  keyboard_send_scancodes(codes: number[]): void {
    this.scancodes.push(...codes);
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
  }
}

function setup(options: { wasm?: boolean; pixelRatio?: number; create?: () => Promise<FakeEmulator> } = {}) {
  const states: MachineState[] = [];
  const created: Record<string, unknown>[] = [];
  const emulators: FakeEmulator[] = [];
  const resizes = { count: 0 };
  let now = 0;
  let tick: (() => void) | null = null;
  const machine = new Machine({
    create: async (machineOptions) => {
      created.push(machineOptions);
      const emulator = options.create ? await options.create() : new FakeEmulator();
      emulators.push(emulator);
      return emulator;
    },
    hasWebAssembly: () => options.wasm ?? true,
    devicePixelRatio: () => options.pixelRatio ?? 1,
    now: () => now,
    every: (_ms, fn) => {
      tick = fn;
      return () => {
        tick = null;
      };
    },
    onState: (state) => states.push(state),
    onScreenSizeChange: () => {
      resizes.count++;
    },
  });
  const advance = (ms: number) => {
    now += ms;
    tick?.();
  };
  return { machine, states, created, emulators, resizes, advance };
}

describe("Machine", () => {
  it("passes the block to v86 with its disk in the site's images folder, adding only the runtime, screen and autostart", async () => {
    const t = setup();
    await t.machine.boot({ memory_size: 16777216, ...block }, runtime, container);
    expect(t.created[0]).toEqual({
      memory_size: 16777216,
      fda: { url: "/RetroMuseum/images/tetros.img", size: 512 },
      wasm_path: "/v86.wasm",
      bios: { url: "/bios/seabios.bin" },
      vga_bios: { url: "/bios/vgabios.bin" },
      screen: { container, use_graphical_text: true },
      autostart: true,
    });
    expect(t.states.at(-1)).toEqual({ kind: "running", downloadedMB: 0 });
  });

  it("reports megabytes downloaded", async () => {
    const t = setup();
    await t.machine.boot(block, runtime, container);
    t.emulators[0].emit("download-progress", { file_name: "a", loaded: 2 * MB, total: 4 * MB, lengthComputable: true });
    expect(t.states.at(-1)).toEqual({ kind: "running", downloadedMB: 2 });
  });

  it("shows a download error", async () => {
    const t = setup();
    await t.machine.boot(block, runtime, container);
    t.emulators[0].emit("download-error");
    expect(t.states.at(-1)).toEqual({ kind: "error", error: "download", downloadedMB: 0 });
  });

  it("reports a stall when a started download gets no bytes for 60 seconds", async () => {
    const t = setup();
    await t.machine.boot(block, runtime, container);
    t.emulators[0].emit("download-progress", { file_name: "a", loaded: MB, total: 4 * MB, lengthComputable: true });
    t.advance(55_000);
    expect(t.states.at(-1)?.kind).toBe("running");
    t.advance(5_000);
    expect(t.states.at(-1)).toEqual({ kind: "error", error: "stalled", downloadedMB: 1 });
  });

  it("never reports a stall while nothing is downloading", async () => {
    const t = setup();
    await t.machine.boot(block, runtime, container);
    t.advance(600_000);
    expect(t.states.at(-1)?.kind).toBe("running");
  });

  it("Stop destroys the emulator and returns to idle", async () => {
    const t = setup();
    await t.machine.boot(block, runtime, container);
    await t.machine.stop();
    expect(t.emulators[0].destroyed).toBe(true);
    expect(t.states.at(-1)).toEqual({ kind: "idle" });
  });

  it("booting again destroys the previous emulator first", async () => {
    const t = setup();
    await t.machine.boot(block, runtime, container);
    await t.machine.boot(block, runtime, container);
    expect(t.emulators[0].destroyed).toBe(true);
    expect(t.emulators[1].destroyed).toBe(false);
  });

  it("destroys an emulator that finishes loading after Stop", async () => {
    let resolve: (emulator: FakeEmulator) => void = () => {};
    const t = setup({ create: () => new Promise((done) => (resolve = done)) });
    const booting = t.machine.boot(block, runtime, container);
    await vi.waitFor(() => expect(t.created).toHaveLength(1));
    await t.machine.stop();
    const late = new FakeEmulator();
    resolve(late);
    await booting;
    expect(late.destroyed).toBe(true);
    expect(t.states.at(-1)).toEqual({ kind: "idle" });
  });

  it("refuses to boot without WebAssembly", async () => {
    const t = setup({ wasm: false });
    await t.machine.boot(block, runtime, container);
    expect(t.created).toHaveLength(0);
    expect(t.states.at(-1)).toEqual({ kind: "error", error: "no-wasm", downloadedMB: 0 });
  });

  it("fits the screen into its area", async () => {
    const t = setup({ pixelRatio: 2 });
    await t.machine.boot(block, runtime, container);
    t.machine.fit({ width: 1440, height: 1000 }, { width: 720, height: 400 });
    expect(t.emulators[0].scale).toEqual([2, 2]);
  });

  it("makes up for v86 dividing the scale by a fractional device pixel ratio", async () => {
    const t = setup({ pixelRatio: 1.25 });
    await t.machine.boot(block, runtime, container);
    t.machine.fit({ width: 1440, height: 1000 }, { width: 720, height: 400 });
    expect(t.emulators[0].scale).toEqual([2.5, 2.5]);
  });

  it("never leaves v86 with a scale of exactly 1, which it doesn't apply", async () => {
    for (const pixelRatio of [1, 1.25]) {
      const t = setup({ pixelRatio });
      await t.machine.boot(block, runtime, container);
      t.machine.fit({ width: 720, height: 400 }, { width: 720, height: 400 });
      const [scale] = t.emulators[0].scale ?? [0];
      const applied = pixelRatio % 1 === 0 ? scale : scale / pixelRatio;
      expect(applied).not.toBe(1);
      expect(applied).toBeCloseTo(1, 6);
    }
  });

  it("asks the page to fit again when the guest changes its screen size", async () => {
    const t = setup();
    await t.machine.boot(block, runtime, container);
    t.emulators[0].emit("screen-set-size", [640, 480, 8]);
    expect(t.resizes.count).toBe(1);
  });

  it("sends Ctrl+Alt+Del", async () => {
    const t = setup();
    await t.machine.boot(block, runtime, container);
    t.machine.ctrlAltDel();
    expect(t.emulators[0].scancodes).toEqual(CTRL_ALT_DEL);
  });
});
