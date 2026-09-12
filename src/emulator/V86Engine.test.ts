import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VMProfile, VMStats, VMStatus } from "./types";

function makeSnapshot(size = 16): ArrayBuffer {
  const buf = new ArrayBuffer(size);
  new DataView(buf).setUint32(0, 0x86768676, true);
  return buf;
}

const fake = vi.hoisted(() => ({
  listeners: new Map<string, (data?: unknown) => void>(),
  counter: 0,
  stop: vi.fn(async () => {}),
  run: vi.fn(),
  destroy: vi.fn(async () => {}),
  restart: vi.fn(),
  save_state: vi.fn(async () => makeSnapshot(16)),
  restore_state: vi.fn(async () => {}),
  create_file: vi.fn(async () => {}),
  read_file: vi.fn(async () => new Uint8Array([1, 2, 3])),
  keyboard_set_enabled: vi.fn(),
  mouse_set_enabled: vi.fn(),
  keyboard_send_text: vi.fn(),
  screen_make_screenshot: vi.fn(() => ({ src: "data:image/png;base64,test" })),
}));

vi.mock("./runtime", () => ({
  assetUrl: (path: string) => `/WebOS/${path}`,
  loadRuntime: async () => class {
    constructor() {
      return {
        ...fake,
        add_listener: (key: string, cb: (data?: unknown) => void) => fake.listeners.set(key, cb),
        get_instruction_counter: () => fake.counter,
      };
    }
  },
}));

import { V86Engine } from "./V86Engine";

const profile: VMProfile = {
  id: "test",
  name: "Test",
  category: "micro",
  mode: "cli",
  description: "",
  tagline: "",
  memorySize: 128 * 1024 ** 2,
  vgaMemorySize: 4 * 1024 ** 2,
};

let docListeners: Map<string, EventListener>;
let winListeners: Map<string, EventListener>;
let containerListeners: Map<string, EventListener>;
let activeElement: unknown = null;

let container: HTMLElement;
let engine: V86Engine;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  vi.clearAllMocks();
  fake.listeners.clear();
  fake.counter = 0;

  docListeners = new Map();
  winListeners = new Map();
  containerListeners = new Map();
  activeElement = null;

  container = {
    innerHTML: "",
    appendChild: vi.fn(),
    contains: (el: unknown) => el === container,
    focus: vi.fn(),
    addEventListener: vi.fn((ev: string, cb: EventListener) => containerListeners.set(ev, cb)),
    removeEventListener: vi.fn((ev: string) => containerListeners.delete(ev)),
  } as unknown as HTMLElement;

  vi.stubGlobal("window", {
    setInterval,
    clearInterval,
    addEventListener: vi.fn((ev: string, cb: EventListener) => winListeners.set(ev, cb)),
    removeEventListener: vi.fn((ev: string) => winListeners.delete(ev)),
  });

  vi.stubGlobal("document", {
    get activeElement() {
      return activeElement;
    },
    createElement: () => ({ style: {} }),
    addEventListener: vi.fn((ev: string, cb: EventListener) => docListeners.set(ev, cb)),
    removeEventListener: vi.fn((ev: string) => docListeners.delete(ev)),
  });
});

afterEach(async () => {
  await engine?.destroy();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function boot(
  overrides: Partial<VMProfile> = {},
  callbacks: {
    onStatsUpdate?: (stats: VMStats) => void;
    onStatusChange?: (status: VMStatus) => void;
    onError?: (err: Error) => void;
    onSerialOutput?: (char: string) => void;
  } = {}
) {
  engine = new V86Engine(
    { ...profile, ...overrides },
    { mode: "offline", channelName: "test" },
    callbacks
  );
  await engine.start(container);
  fake.listeners.get("emulator-ready")?.();
}

describe("VM lifecycle", () => {
  it("stops before snapshots and preserves paused state during restore", async () => {
    await boot();
    await engine.saveState();
    expect(fake.stop.mock.invocationCallOrder[0]).toBeLessThan(fake.save_state.mock.invocationCallOrder[0]);
    expect(engine.getStatus()).toBe("running");
    await engine.pause();
    fake.run.mockClear();
    await engine.restoreState(makeSnapshot(16));
    expect(engine.getStatus()).toBe("paused");
    expect(fake.run).not.toHaveBeenCalled();
  });

  it("recovers the previous execution state if saving fails", async () => {
    await boot();
    fake.save_state.mockRejectedValueOnce(new Error("storage failure"));
    await expect(engine.saveState()).rejects.toThrow("storage failure");
    expect(engine.getStatus()).toBe("running");
    expect(fake.run).toHaveBeenCalled();
  });

  it("measures instruction deltas and excludes paused time from uptime", async () => {
    const stats = vi.fn();
    await boot({}, { onStatsUpdate: stats });
    fake.counter = 10_000_000;
    await vi.advanceTimersByTimeAsync(1000);
    expect(stats.mock.lastCall?.[0].mips).toBe("10.0");
    fake.counter = 15_000_000;
    await vi.advanceTimersByTimeAsync(1000);
    expect(stats.mock.lastCall?.[0].mips).toBe("5.0");
    await engine.pause();
    await vi.advanceTimersByTimeAsync(5000);
    await engine.resume();
    await vi.advanceTimersByTimeAsync(1000);
    expect(stats.mock.lastCall?.[0].uptimeSeconds).toBe(3);
  });

  it("rejects unsupported uploads and maps the Micro shared mount", async () => {
    await boot();
    await expect(engine.createFileInGuest("/root/file", new Uint8Array())).rejects.toThrow("requires 9P");
    await engine.destroy();
    await boot({ filesystem: {}, sharedDirectory: "/mnt" });
    await engine.createFileInGuest("/mnt/file", new Uint8Array([42]));
    expect(fake.create_file).toHaveBeenCalledWith("/file", new Uint8Array([42]));
    await expect(engine.createFileInGuest("/root/file", new Uint8Array())).rejects.toThrow("inside /mnt/");
  });

  it("blocks directory traversal attempts in createFileInGuest", async () => {
    await boot({ filesystem: {}, sharedDirectory: "/mnt" });
    await expect(engine.createFileInGuest("/mnt/../etc/passwd", new Uint8Array([1]))).rejects.toThrow("inside /mnt/");
    await expect(engine.createFileInGuest("/mnt/dir/../../root/.bashrc", new Uint8Array([1]))).rejects.toThrow("inside /mnt/");
    await expect(engine.createFileInGuest("/mnt/file\0.sh", new Uint8Array([1]))).rejects.toThrow("null bytes");
    await expect(engine.createFileInGuest("/mnt/..", new Uint8Array([1]))).rejects.toThrow("empty");
  });

  it("rejects corrupted, empty, or truncated snapshot buffers in restoreState", async () => {
    await boot();
    await expect(engine.restoreState(new ArrayBuffer(0))).rejects.toThrow("empty");
    await expect(engine.restoreState(new ArrayBuffer(8))).rejects.toThrow("too small");
    await expect(engine.restoreState(new ArrayBuffer(16))).rejects.toThrow("unrecognized magic header");
  });

  it("ignores readiness events after disposal", async () => {
    await boot();
    await engine.destroy();
    fake.listeners.get("emulator-ready")?.();
    expect(engine.getStatus()).toBe("idle");
  });

  it("types the profile's autorun command only after the initial state is loaded", async () => {
    await boot({ autorun: "./startx.sh\n" });
    // emulator-ready fires before v86 restores initial_state, so typing then would be lost.
    expect(fake.keyboard_send_text).not.toHaveBeenCalled();
    fake.listeners.get("emulator-loaded")?.();
    expect(fake.keyboard_send_text).toHaveBeenCalledWith("./startx.sh\n");
  });

  it("does not autorun when starting from a restored snapshot", async () => {
    engine = new V86Engine({ ...profile, autorun: "./startx.sh\n" }, { mode: "offline", channelName: "test" });
    await engine.start(container, makeSnapshot(16));
    fake.listeners.get("emulator-ready")?.();
    fake.listeners.get("emulator-loaded")?.();
    expect(fake.keyboard_send_text).not.toHaveBeenCalled();
  });
});

describe("Input isolation and focus management", () => {
  it("enables keyboard/mouse when container is focused and disables when blurred", async () => {
    await boot();

    // Focus inside container
    activeElement = container;
    docListeners.get("focusin")?.(new Event("focusin"));
    expect(fake.keyboard_set_enabled).toHaveBeenLastCalledWith(true);
    expect(fake.mouse_set_enabled).toHaveBeenLastCalledWith(true);

    // Focus moved outside container
    activeElement = null;
    docListeners.get("focusout")?.(new Event("focusout"));
    expect(fake.keyboard_set_enabled).toHaveBeenLastCalledWith(false);
    expect(fake.mouse_set_enabled).toHaveBeenLastCalledWith(false);

    // Window blur releases input
    winListeners.get("blur")?.(new Event("blur"));
    expect(fake.keyboard_set_enabled).toHaveBeenLastCalledWith(false);
    expect(fake.mouse_set_enabled).toHaveBeenLastCalledWith(false);

    // Pointerdown focuses the container
    containerListeners.get("pointerdown")?.(new Event("pointerdown"));
    expect(container.focus).toHaveBeenCalled();
  });

  it("cleans up input listeners upon destroy", async () => {
    await boot();
    expect(docListeners.size).toBeGreaterThan(0);
    expect(containerListeners.size).toBeGreaterThan(0);

    await engine.destroy();
    expect(docListeners.size).toBe(0);
    expect(containerListeners.size).toBe(0);
    expect(winListeners.size).toBe(0);
  });
});

describe("Error handling and boot resilience", () => {
  it("triggers error when boot times out after 120 seconds", async () => {
    const onError = vi.fn();
    const onStatusChange = vi.fn();
    engine = new V86Engine(profile, { mode: "offline", channelName: "test" }, { onError, onStatusChange });
    await engine.start(container);
    expect(engine.getStatus()).toBe("booting");

    // Advance timers past 120s boot timeout
    await vi.advanceTimersByTimeAsync(120_500);

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/Boot timed out/) }));
    expect(engine.getStatus()).toBe("error");
  });

  it("handles download-error event and transitions to error state", async () => {
    const onError = vi.fn();
    engine = new V86Engine(profile, { mode: "offline", channelName: "test" }, { onError });
    await engine.start(container);

    fake.listeners.get("download-error")?.({ file_name: "kernel.bin" });
    await vi.advanceTimersByTimeAsync(10);

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/Unable to load kernel\.bin/) }));
    expect(engine.getStatus()).toBe("error");
  });

  it("handles restoreState error and notifies onError callback", async () => {
    const onError = vi.fn();
    await boot({}, { onError });
    fake.restore_state.mockRejectedValueOnce(new Error("corrupted state"));

    await expect(engine.restoreState(makeSnapshot(16))).rejects.toThrow("corrupted state");
    expect(engine.getStatus()).toBe("error");
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "corrupted state" }));
  });
});

describe("Runtime controls, serial, and file reading", () => {
  it("handles pause, resume, and restart controls", async () => {
    await boot();
    expect(engine.getStatus()).toBe("running");

    await engine.pause();
    expect(fake.stop).toHaveBeenCalled();
    expect(engine.getStatus()).toBe("paused");

    await engine.resume();
    expect(fake.run).toHaveBeenCalled();
    expect(engine.getStatus()).toBe("running");

    engine.restart();
    expect(fake.restart).toHaveBeenCalled();
    expect(fake.run).toHaveBeenCalled();
    expect(engine.getStatus()).toBe("running");
  });

  it("captures screenshot or returns null when unsupported", async () => {
    await boot();
    const screenshot = engine.captureScreenshot();
    expect(screenshot).toBe("data:image/png;base64,test");

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    fake.screen_make_screenshot.mockImplementationOnce(() => {
      throw new Error("canvas detached");
    });
    expect(engine.captureScreenshot()).toBeNull();
    warnSpy.mockRestore();
  });

  it("forwards serial0 output byte events to callback", async () => {
    const onSerialOutput = vi.fn();
    await boot({}, { onSerialOutput });

    fake.listeners.get("serial0-output-byte")?.(0x48); // 'H'
    fake.listeners.get("serial0-output-byte")?.(0x69); // 'i'
    expect(onSerialOutput).toHaveBeenCalledWith("H");
    expect(onSerialOutput).toHaveBeenCalledWith("i");
  });

  it("reads files from guest filesystem with path sanitization", async () => {
    await boot({ filesystem: {}, sharedDirectory: "/mnt" });
    const data = await engine.readFileFromGuest("/mnt/data.bin");
    expect(data).toEqual(new Uint8Array([1, 2, 3]));
    expect(fake.read_file).toHaveBeenCalledWith("/data.bin");

    await engine.destroy();
    await boot(); // No filesystem
    await expect(engine.readFileFromGuest("/test.txt")).rejects.toThrow("requires 9P");
  });
});
