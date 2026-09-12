import type { NetworkConfig } from "./types";

export class NetworkBridge {
  private config: NetworkConfig;
  private broadcastChannel: BroadcastChannel | null = null;
  private onReceiveCallback: ((packet: Uint8Array) => void) | null = null;
  public bytesSent = 0;
  public bytesReceived = 0;

  constructor(config: NetworkConfig) {
    this.config = config;
    this.setup();
  }

  public updateConfig(newConfig: NetworkConfig) {
    this.destroy();
    this.config = newConfig;
    this.setup();
  }

  private setup() {
    if (this.config.mode === "inbrowser") {
      this.broadcastChannel = new BroadcastChannel(this.config.channelName || "webos-lab-mesh");
      this.broadcastChannel.onmessage = (event) => {
        if (event.data instanceof Uint8Array || event.data instanceof ArrayBuffer) {
          const packet = event.data instanceof ArrayBuffer ? new Uint8Array(event.data) : event.data;
          this.bytesReceived += packet.byteLength;
          if (this.onReceiveCallback) {
            this.onReceiveCallback(packet);
          }
        }
      };
    }
  }

  public bindToEmulator(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emulator: any,
    onPacketSent?: (packet: Uint8Array) => void
  ) {
    if (this.config.mode === "inbrowser") {
      this.onReceiveCallback = (packet: Uint8Array) => {
        try {
          if (emulator && emulator.bus) {
            emulator.bus.send("net0-receive", packet);
          }
        } catch (e) {
          console.warn("Failed to deliver network packet to VM:", e);
        }
      };

      emulator.add_listener("net0-send", (packet: Uint8Array) => {
        this.bytesSent += packet.byteLength;
        if (this.broadcastChannel) {
          this.broadcastChannel.postMessage(packet);
        }
        if (onPacketSent) {
          onPacketSent(packet);
        }
      });
    }
  }

  public destroy() {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    this.onReceiveCallback = null;
  }
}
