import { V86 } from "v86";
import type { VMProfile, VMStatus, VMStats, NetworkConfig } from "./types";
import { NetworkBridge } from "./networking";
import { sendSpecialKey, sendText } from "./clipboard";

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
  private instance: any = null;
  private status: VMStatus = "idle";
  private networkBridge: NetworkBridge | null = null;
  private statsInterval: number | null = null;
  private startTime = 0;
  private totalUptime = 0;

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
    this.status = status;
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(status);
    }
  }

  public async start(screenContainer: HTMLElement, customSnapshotBuffer?: ArrayBuffer) {
    if (this.instance) {
      await this.destroy();
    }

    this.setStatus("booting");

    try {
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
        wasm_path: "/v86/v86.wasm",
        memory_size: this.profile.memorySize,
        vga_memory_size: this.profile.vgaMemorySize,
        screen_container: screenContainer,
        bios: {
          url: this.profile.biosUrl || "/bios/seabios.bin",
        },
        vga_bios: {
          url: this.profile.vgaBiosUrl || "/bios/vgabios.bin",
        },
        autostart: true,
      };

      // Custom restored snapshot from IndexedDB/File takes priority
      if (customSnapshotBuffer) {
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

      // Instantiate V86 (either from window.V86 or imported)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const V86Constructor = (window as any).V86 || V86;
      if (!V86Constructor) {
        throw new Error("v86 emulator library not found. Please verify libv86 is loaded.");
      }


      this.instance = new V86Constructor(options);

      // Setup in-browser BroadcastChannel mesh network
      this.networkBridge = new NetworkBridge(this.networkConfig);
      this.networkBridge.bindToEmulator(this.instance);

      // Bind emulator events
      this.instance.add_listener("emulator-ready", () => {
        this.setStatus("running");
        this.startTime = Date.now();
        this.startStatsMonitor();
      });

      this.instance.add_listener("emulator-stopped", () => {
        if (this.status !== "saving" && this.status !== "restoring") {
          this.setStatus("paused");
        }
      });

      this.instance.add_listener("serial0-output-char", (char: string) => {
        if (this.callbacks.onSerialOutput) {
          this.callbacks.onSerialOutput(char);
        }
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
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
      this.setStatus("running");
    }
  }

  public async saveState(): Promise<ArrayBuffer> {
    if (!this.instance) throw new Error("Emulator is not running");
    const prevStatus = this.status;
    this.setStatus("saving");
    try {
      const buffer = await this.instance.save_state();
      this.setStatus(prevStatus);
      return buffer;
    } catch (e) {
      this.setStatus(prevStatus);
      throw e;
    }
  }

  public async restoreState(buffer: ArrayBuffer): Promise<void> {
    if (!this.instance) throw new Error("Emulator is not running");
    this.setStatus("restoring");
    try {
      await this.instance.stop();
      await this.instance.restore_state(buffer);
      await this.instance.run();
      this.setStatus("running");
    } catch (e) {
      this.setStatus("error");
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
      const img = this.instance.make_screenshot();
      return img?.src || null;
    } catch (e) {
      console.warn("Screenshot capture error:", e);
      return null;
    }
  }

  public async createFileInGuest(filePath: string, data: Uint8Array): Promise<void> {
    if (!this.instance) throw new Error("Emulator not initialized");
    if (typeof this.instance.create_file === "function") {
      await this.instance.create_file(filePath, data);
    } else {
      throw new Error("create_file not supported on this VM profile (requires 9P)");
    }
  }

  public async readFileFromGuest(filePath: string): Promise<Uint8Array> {
    if (!this.instance) throw new Error("Emulator not initialized");
    if (typeof this.instance.read_file === "function") {
      return await this.instance.read_file(filePath);
    } else {
      throw new Error("read_file not supported on this VM profile (requires 9P)");
    }
  }

  private startStatsMonitor() {
    this.stopStatsMonitor();
    this.statsInterval = window.setInterval(() => {
      if (!this.instance || this.status !== "running") return;

      const ips = this.instance.get_instruction_counter ? this.instance.get_instruction_counter() : 0;
      const uptime = Math.floor((Date.now() - this.startTime) / 1000) + this.totalUptime;

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
