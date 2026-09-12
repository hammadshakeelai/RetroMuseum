// @vitest-environment happy-dom
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VMProfile } from "./types";

const { mockEngineInstances, MockEngine, mockSavedSnapshots } = vi.hoisted(() => {
  const mockEngineInstances: any[] = [];
  const mockSavedSnapshots: any[] = [];

  class MockEngine {
    profile: any;
    networkConfig: unknown;
    callbacks: {
      onStatusChange?: (s: any) => void;
      onStatsUpdate?: (s: any) => void;
      onError?: (e: Error) => void;
      onSerialOutput?: (c: string) => void;
    };
    start = vi.fn(async (_container: HTMLElement, _buffer?: ArrayBuffer) => {
      this.callbacks.onStatusChange?.("running");
    });
    pause = vi.fn(async () => {
      this.callbacks.onStatusChange?.("paused");
    });
    resume = vi.fn(async () => {
      this.callbacks.onStatusChange?.("running");
    });
    restart = vi.fn();
    destroy = vi.fn(async () => {
      this.callbacks.onStatusChange?.("idle");
    });
    saveState = vi.fn(async () => new ArrayBuffer(16));
    restoreState = vi.fn(async () => {});
    sendKeyCodes = vi.fn();
    sendText = vi.fn();
    captureScreenshot = vi.fn(() => "data:image/png;base64,mock");
    createFileInGuest = vi.fn(async () => {});

    constructor(profile: any, networkConfig: unknown, callbacks: any) {
      this.profile = profile;
      this.networkConfig = networkConfig;
      this.callbacks = callbacks;
      mockEngineInstances.push(this);
    }
  }

  return { mockEngineInstances, MockEngine, mockSavedSnapshots };
});

vi.mock("./V86Engine", () => ({
  V86Engine: MockEngine,
}));

vi.mock("./storage", () => ({
  saveSnapshot: vi.fn(async (profileId: string, profileName: string, label: string, data: ArrayBuffer) => {
    const snap = { id: "snap_1", profileId, profileName, label, data, timestamp: 12345, sizeBytes: data.byteLength };
    mockSavedSnapshots.push(snap);
    return snap;
  }),
}));

import { useV86 } from "./useV86";

const profile1: VMProfile = {
  id: "profile-1",
  name: "Profile 1",
  category: "micro",
  mode: "cli",
  description: "Test VM 1",
  tagline: "Test VM 1",
  memorySize: 128 * 1024 * 1024,
  vgaMemorySize: 4 * 1024 * 1024,
};

const profile2: VMProfile = {
  id: "profile-2",
  name: "Profile 2",
  category: "arch",
  mode: "gui",
  description: "Test VM 2",
  tagline: "Test VM 2",
  memorySize: 512 * 1024 * 1024,
  vgaMemorySize: 8 * 1024 * 1024,
};

import { createElement } from "react";

function renderHook<T>(hook: () => T) {
  const result = { current: null as unknown as T };
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  function TestComponent() {
    result.current = hook();
    return null;
  }

  act(() => {
    root.render(createElement(TestComponent));
  });

  return {
    result,
    unmount: () => {
      act(() => {
        root.unmount();
        container.remove();
      });
    },
  };
}

describe("useV86 hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockEngineInstances.length = 0;
    mockSavedSnapshots.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes with initial profile, idle status, and memory stats", () => {
    const { result, unmount } = renderHook(() => useV86({ initialProfile: profile1 }));

    expect(result.current.profile).toEqual(profile1);
    expect(result.current.status).toBe("idle");
    expect(result.current.stats.memoryMB).toBe(128);
    expect(result.current.stats.vgaMemoryMB).toBe(4);
    expect(result.current.stats.mips).toBe("0.0");
    expect(result.current.stats.uptimeSeconds).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.serialLogs).toBe("");

    unmount();
  });

  it("does not boot VM if containerRef is not attached", async () => {
    const { result, unmount } = renderHook(() => useV86({ initialProfile: profile1 }));

    await act(async () => {
      await result.current.startVM();
    });

    expect(mockEngineInstances).toHaveLength(0);
    expect(result.current.status).toBe("idle");

    unmount();
  });

  it("boots VM when containerRef is set and transitions to running status", async () => {
    const { result, unmount } = renderHook(() => useV86({ initialProfile: profile1 }));
    const screenDiv = document.createElement("div");
    result.current.containerRef.current = screenDiv;

    await act(async () => {
      await result.current.startVM();
    });

    expect(mockEngineInstances).toHaveLength(1);
    const engine = mockEngineInstances[0];
    expect(engine.start).toHaveBeenCalledWith(screenDiv, undefined);
    expect(result.current.status).toBe("running");

    unmount();
  });

  it("handles pause, resume, and restart controls via engine delegation", async () => {
    const { result, unmount } = renderHook(() => useV86({ initialProfile: profile1 }));
    result.current.containerRef.current = document.createElement("div");

    await act(async () => {
      await result.current.startVM();
    });

    const engine = mockEngineInstances[0];

    await act(async () => {
      await result.current.pauseVM();
    });
    expect(engine.pause).toHaveBeenCalled();
    expect(result.current.status).toBe("paused");

    await act(async () => {
      await result.current.resumeVM();
    });
    expect(engine.resume).toHaveBeenCalled();
    expect(result.current.status).toBe("running");

    act(() => {
      result.current.restartVM();
    });
    expect(engine.restart).toHaveBeenCalled();

    unmount();
  });

  it("switches profile, updates state, and resets hardware telemetry", async () => {
    const { result, unmount } = renderHook(() => useV86({ initialProfile: profile1 }));
    result.current.containerRef.current = document.createElement("div");

    await act(async () => {
      await result.current.startVM();
    });
    expect(result.current.stats.memoryMB).toBe(128);

    await act(async () => {
      await result.current.switchProfile(profile2);
    });

    expect(result.current.profile).toEqual(profile2);
    expect(result.current.stats.memoryMB).toBe(512);
    expect(result.current.stats.vgaMemoryMB).toBe(8);
    expect(mockEngineInstances).toHaveLength(2);
    expect(mockEngineInstances[0].destroy).toHaveBeenCalled();

    unmount();
  });

  it("saves and restores VM snapshots", async () => {
    const { result, unmount } = renderHook(() => useV86({ initialProfile: profile1 }));
    result.current.containerRef.current = document.createElement("div");

    // Saving when no VM is running throws
    await expect(result.current.saveVMSnapshot("test")).rejects.toThrow("No VM running");

    await act(async () => {
      await result.current.startVM();
    });

    const engine = mockEngineInstances[0];
    let snapshot: unknown;
    await act(async () => {
      snapshot = await result.current.saveVMSnapshot("my-checkpoint");
    });

    expect(engine.saveState).toHaveBeenCalled();
    expect(snapshot).toEqual(expect.objectContaining({ label: "my-checkpoint", profileId: "profile-1" }));

    // In-place restore when running
    const restoreBuf = new ArrayBuffer(16);
    await act(async () => {
      await result.current.restoreVMSnapshot(restoreBuf);
    });
    expect(engine.restoreState).toHaveBeenCalledWith(restoreBuf);

    unmount();
  });

  it("delegates keyboard and command text inputs to the engine", async () => {
    const { result, unmount } = renderHook(() => useV86({ initialProfile: profile1 }));
    result.current.containerRef.current = document.createElement("div");

    await act(async () => {
      await result.current.startVM();
    });

    const engine = mockEngineInstances[0];
    act(() => {
      result.current.sendKey([0x1d, 0x2e]);
    });
    expect(engine.sendKeyCodes).toHaveBeenCalledWith([0x1d, 0x2e]);

    act(() => {
      result.current.sendCommandText("ls -la\n");
    });
    expect(engine.sendText).toHaveBeenCalledWith("ls -la\n");

    const screenshot = result.current.takeScreenshot();
    expect(screenshot).toBe("data:image/png;base64,mock");

    unmount();
  });

  it("guards guest file uploads when VM is not running and passes through when active", async () => {
    const { result, unmount } = renderHook(() => useV86({ initialProfile: profile1 }));

    await expect(result.current.uploadGuestFile("/root/test.txt", new Uint8Array([1, 2]))).rejects.toThrow(
      "Power on a VM before uploading files."
    );

    result.current.containerRef.current = document.createElement("div");
    await act(async () => {
      await result.current.startVM();
    });

    const engine = mockEngineInstances[0];
    await act(async () => {
      await result.current.uploadGuestFile("/root/test.txt", new Uint8Array([1, 2]));
    });
    expect(engine.createFileInGuest).toHaveBeenCalledWith("/root/test.txt", new Uint8Array([1, 2]));

    unmount();
  });

  it("buffers serial logs and flushes them on a 100ms throttle timer", async () => {
    const { result, unmount } = renderHook(() => useV86({ initialProfile: profile1 }));
    result.current.containerRef.current = document.createElement("div");

    await act(async () => {
      await result.current.startVM();
    });

    const engine = mockEngineInstances[0];

    // Emit serial output bytes
    act(() => {
      engine.callbacks.onSerialOutput?.("B");
      engine.callbacks.onSerialOutput?.("o");
      engine.callbacks.onSerialOutput?.("o");
      engine.callbacks.onSerialOutput?.("t");
    });

    // Before timer advances, state is not yet updated to avoid render thrashing
    expect(result.current.serialLogs).toBe("");

    // Advance 100ms throttle timer
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.serialLogs).toBe("Boot");

    // Clear logs
    act(() => {
      result.current.clearSerialLogs();
    });
    expect(result.current.serialLogs).toBe("");

    unmount();
  });

  it("cancels stale asynchronous boot operations when generation advances", async () => {
    const { result, unmount } = renderHook(() => useV86({ initialProfile: profile1 }));
    result.current.containerRef.current = document.createElement("div");

    let slowStartResolve: () => void = () => {};
    const slowStartPromise = new Promise<void>((resolve) => {
      slowStartResolve = resolve;
    });

    // First VM start is slow
    act(() => {
      void result.current.startVM(profile1);
    });

    const firstEngine = mockEngineInstances[0];
    firstEngine.start.mockImplementationOnce(async () => {
      await slowStartPromise;
    });

    // Immediately trigger second VM start (advancing generation)
    await act(async () => {
      await result.current.startVM(profile2);
    });

    const secondEngine = mockEngineInstances[1];
    expect(secondEngine.profile.id).toBe("profile-2");

    // Resolve the first engine's start after second has finished
    slowStartResolve();

    // Emitting error or status from obsolete first engine must be ignored
    act(() => {
      firstEngine.callbacks.onError?.(new Error("stale error"));
      firstEngine.callbacks.onStatusChange?.("error");
    });

    expect(result.current.error).toBeNull();
    expect(result.current.status).not.toBe("error");

    unmount();
  });

  it("destroys engine and clears intervals on unmount", async () => {
    const { result, unmount } = renderHook(() => useV86({ initialProfile: profile1 }));
    result.current.containerRef.current = document.createElement("div");

    await act(async () => {
      await result.current.startVM();
    });

    const engine = mockEngineInstances[0];
    unmount();

    expect(engine.destroy).toHaveBeenCalled();
  });
});
