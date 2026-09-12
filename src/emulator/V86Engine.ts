import type { V86 } from "v86";
import { assetUrl, loadRuntime } from "./runtime";
import type { VMProfile, VMStatus, VMStats, NetworkConfig } from "./types";
import { NetworkBridge } from "./networking";
import { sendSpecialKey, sendText } from "./clipboard";
import {
  validateSnapshotBuffer,
  sanitizeGuestPath,
  MAX_GUEST_FILE_SIZE,
} from "./security";

export interface V86EngineCallbacks {
  onStatusChange?: (status: VMStatus) => void;
  onStatsUpdate?: (stats: VMStats) => void;
  onError?: (err: Error) => void;
  onSerialOutput?: (char: string) => void;
}

export class V86Engine {
  public readonly profile: VMProfile;
  public readonly networkConfig: NetworkConfig;
  private readonly callbacks: V86EngineCallbacks;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private instance: V86 | null = null;
  private status: VMStatus = "idle";
  private networkBridge: NetworkBridge | null = null;
  private statsInterval: number | null = null;
  private startTime = 0;
  private totalUptime = 0;
  private lastCounter = 0;
  private lastSample = 0;
  private disposed = false;
  private cleanupInput?: () => void;
  private bootTimer?: ReturnType<typeof setTimeout>;

  constructor(
    profile: VMProfile,
    networkConfig: NetworkConfig,
    callbacks: V86EngineCallbacks = {}
  ) {
    this.profile = profile;
    this.networkConfig = networkConfig;
    this.callbacks = callbacks;
  }

  public getStatus(): VMStatus {
    return this.status;
  }

  private setStatus(status: VMStatus) {
    if (this.status === "running") this.totalUptime += Date.now() - this.startTime;
    if (status === "running") {
      this.startTime = Date.now();
      this.lastSample = Date.now();
      this.lastCounter = this.instance?.get_instruction_counter() ?? 0;
    }
    this.status = status;
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(status);
    }
  }

  public async start(screenContainer: HTMLElement, customSnapshotBuffer?: ArrayBuffer) {
    if (this.instance) {
      await this.destroy();
    }
    this.disposed = false;
    this.totalUptime = 0;

    this.setStatus("booting");

    try {
      const V86Constructor = await loadRuntime();
      if (this.disposed) return;
      // Ensure screen container has expected sub-elements for v86 ScreenAdapter
      screenContainer.innerHTML = "";
      const textDiv = document.createElement("div");
      textDiv.style.whiteSpace = "pre";
      textDiv.style.font = "14px monospace";
      textDiv.style.lineHeight = "14px";
      textDiv.style.color = "#38bdf8";

      const canvas = document.createElement("canvas");
      canvas.style.display = "none";
      canvas.style.outline = "none";

      screenContainer.appendChild(textDiv);
      screenContainer.appendChild(canvas);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const options: any = {
        wasm_path: assetUrl("v86/v86.wasm"),
        memory_size: this.profile.memorySize,
        vga_memory_size: this.profile.vgaMemorySize,
        screen_container: screenContainer,
        bios: {
          url: this.profile.biosUrl || assetUrl("bios/seabios.bin"),
        },
        vga_bios: {
          url: this.profile.vgaBiosUrl || assetUrl("bios/vgabios.bin"),
        },
        autostart: true,
        net_device: { type: this.profile.netDevice || "ne2k" },
      };

      // Custom restored snapshot from IndexedDB/File takes priority
      if (customSnapshotBuffer) {
        validateSnapshotBuffer(customSnapshotBuffer);
        options.initial_state = {
          buffer: customSnapshotBuffer,
        };
      } else if (this.profile.stateUrl) {
        options.initial_state = {
          url: this.profile.stateUrl,
        };
      }

      // 9P Filesystem configuration
      if (this.profile.filesystem) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fsConfig: any = {
          baseurl: this.profile.filesystem.baseurl,
        };
        if (this.profile.filesystem.basefsUrl) {
          fsConfig.basefs = { url: this.profile.filesystem.basefsUrl };
        }
        options.filesystem = fsConfig;

        // If no separate bzimage URL is given but 9p is used with cmdline, extract bzimage from 9p
        if (!this.profile.bzimageUrl && this.profile.cmdline) {
          options.bzimage_initrd_from_filesystem = true;
        }
      }

      // Direct bzimage / kernel
      if (this.profile.bzimageUrl) {
        options.bzimage = {
          url: this.profile.bzimageUrl,
        };
      }

      // Direct initrd / initramfs
      if (this.profile.initrdUrl) {
        options.initrd = {
          url: this.profile.initrdUrl,
        };
      }

      // CDROM / ISO
      if (this.profile.cdromBuffer) {
        options.cdrom = {
          buffer: this.profile.cdromBuffer,
        };
      } else if (this.profile.cdromUrl) {
        options.cdrom = {
          url: this.profile.cdromUrl,
        };
      }

      // Hard disk (HDA)
      if (this.profile.hdaUrl) {
        options.hda = {
          url: this.profile.hdaUrl,
          size: this.profile.hdaSize,
          async: true,
        };
      }

      // Floppy disk (FDA)
      if (this.profile.fdaUrl) {
        options.fda = {
          url: this.profile.fdaUrl,
        };
      }

      // Kernel cmdline
      if (this.profile.cmdline) {
        options.cmdline = this.profile.cmdline;
      }

      // Network device
      if (this.profile.netDevice) {
        if (this.networkConfig.mode === "wsproxy" && this.networkConfig.relayUrl) {
          options.network_relay_url = this.networkConfig.relayUrl;
        }
      }

      this.instance = new V86Constructor(options);
      const instance = this.instance;
      const updateInput = () => {
        const focused = screenContainer.contains(document.activeElement);
        instance.keyboard_set_enabled(focused);
        instance.mouse_set_enabled(focused);
      };
      const focusScreen = () => screenContainer.focus();
      const releaseInput = () => {
        instance.keyboard_set_enabled(false);
        instance.mouse_set_enabled(false);
      };
      document.addEventListener("focusin", updateInput);
      document.addEventListener("focusout", updateInput);
      window.addEventListener?.("blur", releaseInput);
      screenContainer.addEventListener("pointerdown", focusScreen);
      updateInput();
      this.cleanupInput = () => {
        document.removeEventListener("focusin", updateInput);
        document.removeEventListener("focusout", updateInput);
        window.removeEventListener?.("blur", releaseInput);
        screenContainer.removeEventListener("pointerdown", focusScreen);
      };
      const fail = (message: string) => {
        if (this.disposed) return;
        void this.destroy().then(() => {
          this.setStatus("error");
          this.callbacks.onError?.(new Error(message));
        });
      };
      this.bootTimer = setTimeout(() => fail("Boot timed out. Check the image URL and connection, then retry."), 120_000);
      instance.add_listener("download-error", (event) => fail(`Unable to load ${event.file_name}. Check the URL and CORS permissions.`));

      // Setup in-browser BroadcastChannel mesh network
      this.networkBridge = new NetworkBridge(this.networkConfig);
      this.networkBridge.bindToEmulator(this.instance);

      // Bind emulator events
      this.instance.add_listener("emulator-ready", () => {
        if (this.disposed) return;
        clearTimeout(this.bootTimer);
        this.setStatus("running");
        this.startStatsMonitor();
      });

      this.instance.add_listener("emulator-stopped", () => {
        if (!this.disposed && this.status === "running") {
          this.setStatus("paused");
        }
      });

      this.instance.add_listener("serial0-output-byte", (byte: number) => {
        const char = String.fromCharCode(byte);
        if (this.callbacks.onSerialOutput) {
          this.callbacks.onSerialOutput(char);
        }
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      await this.destroy();
      this.setStatus("error");
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
      throw error;
    }
  }

  public async pause() {
    if (this.instance && this.status === "running") {
      await this.instance.stop();
      this.setStatus("paused");
    }
  }

  public async resume() {
    if (this.instance && this.status === "paused") {
      await this.instance.run();
      this.setStatus("running");
    }
  }

  public restart() {
    if (this.instance) {
      this.instance.restart();
      this.instance.run();
      this.setStatus("running");
    }
  }

  public async saveState(): Promise<ArrayBuffer> {
    if (!this.instance || !["running", "paused"].includes(this.status)) throw new Error("VM must be running or paused");
    const prevStatus = this.status;
    this.setStatus("saving");
    try {
      await this.instance.stop();
      const state = await this.instance.save_state();
      validateSnapshotBuffer(state);
      return state;
    } finally {
      if (prevStatus === "running") this.instance.run();
      this.setStatus(prevStatus);
    }
  }

  public async restoreState(buffer: ArrayBuffer): Promise<void> {
    if (!this.instance) throw new Error("Emulator is not running");
    validateSnapshotBuffer(buffer);
    const wasRunning = this.status === "running";
    this.setStatus("restoring");
    try {
      await this.instance.stop();
      await this.instance.restore_state(buffer);
      if (wasRunning) this.instance.run();
      this.setStatus(wasRunning ? "running" : "paused");
    } catch (e) {
      this.setStatus("error");
      this.callbacks.onError?.(e instanceof Error ? e : new Error(String(e)));
      throw e;
    }
  }

  public sendKeyCodes(scancodes: number[]) {
    sendSpecialKey(this.instance, scancodes);
  }

  public sendText(text: string) {
    sendText(this.instance, text);
  }

  public captureScreenshot(): string | null {
    if (!this.instance) return null;
    try {
      const img = this.instance.screen_make_screenshot() as HTMLImageElement | null;
      return img?.src || null;
    } catch (e) {
      console.warn("Screenshot capture error:", e);
      return null;
    }
  }

  public async createFileInGuest(filePath: string, data: Uint8Array): Promise<void> {
    if (!this.instance) throw new Error("Emulator not initialized");
    if (!data || !(data instanceof Uint8Array)) {
      throw new Error("Invalid file data: expected Uint8Array");
    }
    if (data.byteLength > MAX_GUEST_FILE_SIZE) {
      throw new Error(
        `File size (${(data.byteLength / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed upload size (${MAX_GUEST_FILE_SIZE / (1024 * 1024)} MB)`
      );
    }
    if (this.profile.filesystem) {
      const { destination } = sanitizeGuestPath(filePath, this.profile.sharedDirectory);
      await this.instance.create_file(destination, data);
    } else {
      throw new Error("create_file not supported on this VM profile (requires 9P)");
    }
  }

  public async readFileFromGuest(filePath: string): Promise<Uint8Array> {
    if (!this.instance) throw new Error("Emulator not initialized");
    if (this.profile.filesystem) {
      const { destination } = sanitizeGuestPath(filePath, this.profile.sharedDirectory);
      return await this.instance.read_file(destination);
    } else {
      throw new Error("read_file not supported on this VM profile (requires 9P)");
    }
  }

  private startStatsMonitor() {
    this.stopStatsMonitor();
    this.statsInterval = window.setInterval(() => {
      if (!this.instance || this.status !== "running") return;

      const now = Date.now();
      const counter = this.instance.get_instruction_counter() >>> 0;
      const ips = ((counter - this.lastCounter) >>> 0) * 1000 / Math.max(1, now - this.lastSample);
      this.lastCounter = counter;
      this.lastSample = now;
      const uptime = Math.floor((now - this.startTime + this.totalUptime) / 1000);

      const stats: VMStats = {
        ips,
        mips: (ips / 1_000_000).toFixed(1),
        uptimeSeconds: uptime,
        bytesReceived: this.networkBridge ? this.networkBridge.bytesReceived : 0,
        bytesSent: this.networkBridge ? this.networkBridge.bytesSent : 0,
        memoryMB: Math.round(this.profile.memorySize / (1024 * 1024)),
        vgaMemoryMB: Math.round(this.profile.vgaMemorySize / (1024 * 1024)),
      };

      if (this.callbacks.onStatsUpdate) {
        this.callbacks.onStatsUpdate(stats);
      }
    }, 1000);
  }

  private stopStatsMonitor() {
    if (this.statsInterval !== null) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  public async destroy() {
    this.disposed = true;
    clearTimeout(this.bootTimer);
    this.cleanupInput?.();
    this.stopStatsMonitor();
    if (this.networkBridge) {
      this.networkBridge.destroy();
      this.networkBridge = null;
    }
    if (this.instance) {
      try {
        await this.instance.destroy();
      } catch (e) {
        console.warn("Error while destroying v86 instance:", e);
      }
      this.instance = null;
    }
    this.setStatus("idle");
  }
}
