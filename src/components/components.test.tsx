// @vitest-environment happy-dom
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { QuickKeysDeck } from "./vm/QuickKeysDeck";
import { VMToolbar } from "./vm/VMToolbar";
import { VMViewport } from "./vm/VMViewport";
import { Header } from "./layout/Header";
import { LogsModal } from "./modals/LogsModal";
import { SCANCODES } from "../emulator/clipboard";
import type { VMProfile, VMStats } from "../emulator/types";

const mockProfile: VMProfile = {
  id: "test-profile",
  name: "Alpine Linux Test",
  category: "micro",
  mode: "cli",
  description: "Minimal test distribution",
  tagline: "Test Sandbox • 128 MB RAM",
  memorySize: 128 * 1024 * 1024,
  vgaMemorySize: 4 * 1024 * 1024,
  sharedDirectory: "/mnt",
  filesystem: {},
};

const mockStats: VMStats = {
  ips: 12_500_000,
  mips: "12.5",
  uptimeSeconds: 125,
  bytesReceived: 1024,
  bytesSent: 2048,
  memoryMB: 128,
  vgaMemoryMB: 4,
};

function render(element: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
        container.remove();
      });
    },
    rerender: (el: React.ReactNode) => {
      act(() => {
        root.render(el);
      });
    },
  };
}

describe("QuickKeysDeck component", () => {
  it("renders key buttons and fires onSendKey with correct scancodes", () => {
    const onSendKey = vi.fn();
    const onToggle = vi.fn();

    const { container, unmount } = render(
      createElement(QuickKeysDeck, {
        onSendKey,
        isOpen: true,
        onToggle,
      })
    );

    // Click Ctrl+C
    const ctrlCBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Ctrl+C"
    );
    expect(ctrlCBtn).toBeDefined();

    act(() => {
      ctrlCBtn?.click();
    });
    expect(onSendKey).toHaveBeenCalledWith(SCANCODES.CTRL_C);

    // Click Ctrl+Alt+Del
    const cadBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Ctrl+Alt+Del"
    );
    expect(cadBtn).toBeDefined();

    act(() => {
      cadBtn?.click();
    });
    expect(onSendKey).toHaveBeenCalledWith(SCANCODES.CTRL_ALT_DEL);

    // Dispatches mousedown
    act(() => {
      ctrlCBtn?.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true })
      );
    });

    // Toggle button
    const toggleBtn = container.querySelector("button");
    act(() => {
      toggleBtn?.click();
    });
    expect(onToggle).toHaveBeenCalled();

    unmount();
  });

  it("hides key deck when isOpen is false", () => {
    const { container, unmount } = render(
      createElement(QuickKeysDeck, {
        onSendKey: vi.fn(),
        isOpen: false,
        onToggle: vi.fn(),
      })
    );

    const buttons = container.querySelectorAll("button");
    // Only the toggle button should exist
    expect(buttons.length).toBe(1);
    expect(container.textContent).toContain("show");

    unmount();
  });
});

describe("VMToolbar component", () => {
  it("shows Power On when idle and triggers onStart", () => {
    const onStart = vi.fn();
    const { container, unmount } = render(
      createElement(VMToolbar, {
        status: "idle",
        crtEnabled: false,
        onToggleCrt: vi.fn(),
        onStart,
        onPause: vi.fn(),
        onResume: vi.fn(),
        onRestart: vi.fn(),
        onResetClean: vi.fn(),
        onFullscreen: vi.fn(),
        onScreenshot: vi.fn(),
        onOpenPasteModal: vi.fn(),
        onOpenFileUpload: vi.fn(),
        onOpenLogsModal: vi.fn(),
      })
    );

    const powerBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Power On")
    );
    expect(powerBtn).toBeDefined();

    act(() => {
      powerBtn?.click();
    });
    expect(onStart).toHaveBeenCalled();

    // Secondary controls should be disabled when idle
    const rebootBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Reboot")
    );
    expect(rebootBtn?.disabled).toBe(true);

    unmount();
  });

  it("shows Pause when running and Resume when paused", () => {
    const onPause = vi.fn();
    const onResume = vi.fn();

    const { container, rerender, unmount } = render(
      createElement(VMToolbar, {
        status: "running",
        crtEnabled: false,
        onToggleCrt: vi.fn(),
        onStart: vi.fn(),
        onPause,
        onResume,
        onRestart: vi.fn(),
        onResetClean: vi.fn(),
        onFullscreen: vi.fn(),
        onScreenshot: vi.fn(),
        onOpenPasteModal: vi.fn(),
        onOpenFileUpload: vi.fn(),
        onOpenLogsModal: vi.fn(),
      })
    );

    const pauseBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Pause")
    );
    expect(pauseBtn).toBeDefined();

    act(() => {
      pauseBtn?.click();
    });
    expect(onPause).toHaveBeenCalled();

    // Rerender as paused
    rerender(
      createElement(VMToolbar, {
        status: "paused",
        crtEnabled: false,
        onToggleCrt: vi.fn(),
        onStart: vi.fn(),
        onPause,
        onResume,
        onRestart: vi.fn(),
        onResetClean: vi.fn(),
        onFullscreen: vi.fn(),
        onScreenshot: vi.fn(),
        onOpenPasteModal: vi.fn(),
        onOpenFileUpload: vi.fn(),
        onOpenLogsModal: vi.fn(),
      })
    );

    const resumeBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Resume")
    );
    expect(resumeBtn).toBeDefined();

    act(() => {
      resumeBtn?.click();
    });
    expect(onResume).toHaveBeenCalled();

    unmount();
  });

  it("triggers utility callbacks when running and controls are enabled", () => {
    const onRestart = vi.fn();
    const onScreenshot = vi.fn();
    const onToggleCrt = vi.fn();
    const onOpenPasteModal = vi.fn();

    const { container, unmount } = render(
      createElement(VMToolbar, {
        status: "running",
        crtEnabled: true,
        onToggleCrt,
        onStart: vi.fn(),
        onPause: vi.fn(),
        onResume: vi.fn(),
        onRestart,
        onResetClean: vi.fn(),
        onFullscreen: vi.fn(),
        onScreenshot,
        onOpenPasteModal,
        onOpenFileUpload: vi.fn(),
        onOpenLogsModal: vi.fn(),
      })
    );

    const rebootBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Reboot")
    );
    expect(rebootBtn?.disabled).toBe(false);
    act(() => {
      rebootBtn?.click();
    });
    expect(onRestart).toHaveBeenCalled();

    const pasteBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Paste Command")
    );
    act(() => {
      pasteBtn?.click();
    });
    expect(onOpenPasteModal).toHaveBeenCalled();

    unmount();
  });
});

describe("VMViewport component", () => {
  it("renders idle screen with hardware specs and handles boot action", () => {
    const onStart = vi.fn();
    const containerRef = { current: null };

    const { container, unmount } = render(
      createElement(VMViewport, {
        containerRef,
        status: "idle",
        profile: mockProfile,
        error: null,
        crtEnabled: false,
        onStart,
        onFileDrop: vi.fn(),
      })
    );

    expect(container.textContent).toContain("Alpine Linux Test");
    expect(container.textContent).toContain("RAM: 128 MB");
    expect(container.textContent).toContain("VRAM: 4 MB");
    expect(container.textContent).toContain("CLI");

    const bootBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Power On & Boot VM")
    );
    expect(bootBtn).toBeDefined();

    act(() => {
      bootBtn?.click();
    });
    expect(onStart).toHaveBeenCalled();

    unmount();
  });

  it("renders loader during booting and snapshot saving/restoring", () => {
    const containerRef = { current: null };
    const { container, rerender, unmount } = render(
      createElement(VMViewport, {
        containerRef,
        status: "booting",
        profile: mockProfile,
        error: null,
        crtEnabled: false,
        onStart: vi.fn(),
        onFileDrop: vi.fn(),
      })
    );

    expect(container.textContent).toContain("Initializing Virtual Machine...");

    rerender(
      createElement(VMViewport, {
        containerRef,
        status: "saving",
        profile: mockProfile,
        error: null,
        crtEnabled: false,
        onStart: vi.fn(),
        onFileDrop: vi.fn(),
      })
    );
    expect(container.textContent).toContain("Capturing VM Memory State...");

    rerender(
      createElement(VMViewport, {
        containerRef,
        status: "restoring",
        profile: mockProfile,
        error: null,
        crtEnabled: false,
        onStart: vi.fn(),
        onFileDrop: vi.fn(),
      })
    );
    expect(container.textContent).toContain("Restoring Snapshot into RAM...");

    unmount();
  });

  it("renders error message and retry button in error state", () => {
    const onStart = vi.fn();
    const containerRef = { current: null };

    const { container, unmount } = render(
      createElement(VMViewport, {
        containerRef,
        status: "error",
        profile: mockProfile,
        error: "SeaBIOS ROM corrupted",
        crtEnabled: false,
        onStart,
        onFileDrop: vi.fn(),
      })
    );

    expect(container.textContent).toContain("VM Emulation Error");
    expect(container.textContent).toContain("SeaBIOS ROM corrupted");

    const retryBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Retry Boot")
    );
    act(() => {
      retryBtn?.click();
    });
    expect(onStart).toHaveBeenCalled();

    unmount();
  });

  it("handles drag and drop file operations", () => {
    const onFileDrop = vi.fn();
    const containerRef = { current: null };

    const { container, unmount } = render(
      createElement(VMViewport, {
        containerRef,
        status: "running",
        profile: mockProfile,
        error: null,
        crtEnabled: true,
        onStart: vi.fn(),
        onFileDrop,
      })
    );

    const rootDiv = container.firstElementChild as HTMLElement;

    // Drag over activates drop overlay
    act(() => {
      rootDiv.dispatchEvent(new Event("dragover", { bubbles: true }));
    });
    expect(container.textContent).toContain("Drop file to copy into Linux VM");

    // Drag leave deactivates overlay
    act(() => {
      rootDiv.dispatchEvent(new Event("dragleave", { bubbles: true }));
    });
    expect(container.textContent).not.toContain("Drop file to copy into Linux VM");

    // Drop file
    const file = new File([new Uint8Array([1, 2, 3])], "sample.sh", { type: "text/plain" });
    const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(dropEvent, "dataTransfer", {
      value: { files: [file] },
    });

    act(() => {
      rootDiv.dispatchEvent(dropEvent);
    });
    expect(onFileDrop).toHaveBeenCalledWith(file);

    unmount();
  });
});

describe("Header component", () => {
  it("displays system telemetry (MIPS, RAM, uptime) and profile info", () => {
    const { container, unmount } = render(
      createElement(Header, {
        currentProfile: mockProfile,
        status: "running",
        stats: mockStats,
        onSelectProfile: vi.fn(),
        onOpenSnapshots: vi.fn(),
        onOpenNetwork: vi.fn(),
        onOpenMountMedia: vi.fn(),
        onToggleDualLab: vi.fn(),
        isDualLab: false,
      })
    );

    expect(container.textContent).toContain("12.5 MIPS");
    expect(container.textContent).toContain("128 MB RAM");
    expect(container.textContent).toContain("2m 5s"); // 125s -> 2m 5s
    expect(container.textContent).toContain("Running");

    unmount();
  });

  it("opens profile selector dropdown and invokes onSelectProfile", () => {
    const onSelectProfile = vi.fn();
    const { container, unmount } = render(
      createElement(Header, {
        currentProfile: mockProfile,
        status: "running",
        stats: mockStats,
        onSelectProfile,
        onOpenSnapshots: vi.fn(),
        onOpenNetwork: vi.fn(),
        onOpenMountMedia: vi.fn(),
        onToggleDualLab: vi.fn(),
        isDualLab: false,
      })
    );

    const dropdownBtn = container.querySelector('button[aria-label="Select OS profile"]');
    expect(dropdownBtn).toBeDefined();

    // Open dropdown
    act(() => {
      dropdownBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // Profile list should be visible
    expect(container.textContent).toContain("Select OS Profile");

    // Click Micro Linux profile
    const microBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Micro Linux")
    );
    expect(microBtn).toBeDefined();

    act(() => {
      microBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onSelectProfile).toHaveBeenCalled();

    unmount();
  });

  it("toggles dual lab mode and opens modal dialogs", () => {
    const onToggleDualLab = vi.fn();
    const onOpenSnapshots = vi.fn();
    const onOpenNetwork = vi.fn();
    const onOpenMountMedia = vi.fn();

    const { container, unmount } = render(
      createElement(Header, {
        currentProfile: mockProfile,
        status: "running",
        stats: mockStats,
        onSelectProfile: vi.fn(),
        onOpenSnapshots,
        onOpenNetwork,
        onOpenMountMedia,
        onToggleDualLab,
        isDualLab: false,
      })
    );

    const dualBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Cyber Lab Mode")
    );
    act(() => {
      dualBtn?.click();
    });
    expect(onToggleDualLab).toHaveBeenCalled();

    const snapBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Snapshots")
    );
    act(() => {
      snapBtn?.click();
    });
    expect(onOpenSnapshots).toHaveBeenCalled();

    const netBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Network")
    );
    act(() => {
      netBtn?.click();
    });
    expect(onOpenNetwork).toHaveBeenCalled();

    const mountBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Mount ISO")
    );
    act(() => {
      mountBtn?.click();
    });
    expect(onOpenMountMedia).toHaveBeenCalled();

    unmount();
  });
});

describe("LogsModal component", () => {
  beforeEach(() => {
    // Stub URL createObjectURL
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:http://localhost/test"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("renders serial console output, clear button, and download button", () => {
    const onClear = vi.fn();
    const onClose = vi.fn();

    const { container, unmount } = render(
      createElement(LogsModal, {
        isOpen: true,
        onClose,
        logs: "Linux kernel booting...\n[OK] Reached target System.",
        onClear,
      })
    );

    expect(container.textContent).toContain("Serial Console & Boot Diagnostics");
    expect(container.textContent).toContain("Linux kernel booting...");
    expect(container.textContent).toContain("[OK] Reached target System.");

    // Clear logs button
    const clearBtn = container.querySelector('button[title="Clear Logs"]');
    expect(clearBtn).toBeDefined();
    act(() => {
      clearBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onClear).toHaveBeenCalled();

    // Close button
    const closeBtn = container.querySelector('button[aria-label="Close dialog"]');
    act(() => {
      closeBtn?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onClose).toHaveBeenCalled();

    unmount();
  });
});
