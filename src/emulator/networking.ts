import type { NetworkConfig } from "./types";
import {
  MIN_ETHERNET_FRAME_SIZE,
  MAX_ETHERNET_FRAME_SIZE,
  validateChannelName,
} from "./security";

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
      let channelName = "webos-lab-mesh";
      try {
        channelName = validateChannelName(this.config.channelName || "webos-lab-mesh");
      } catch {
        channelName = "webos-lab-mesh";
      }

      this.broadcastChannel = new BroadcastChannel(channelName);
      this.broadcastChannel.onmessage = (event: MessageEvent) => {
        try {
          const data = event.data;
          if (!data) return;

          let packet: Uint8Array;
          if (data instanceof Uint8Array) {
            packet =
              data.byteOffset === 0 && data.byteLength === data.buffer.byteLength
                ? data
                : new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
          } else if (data instanceof ArrayBuffer) {
            packet = new Uint8Array(data);
          } else {
            // Strictly drop non-binary payloads (e.g. JSON, strings, objects)
            return;
          }

          // Frame bounds check: drop runt packets (< 14 bytes) or oversized packets (> 64 KB)
          if (packet.byteLength < MIN_ETHERNET_FRAME_SIZE || packet.byteLength > MAX_ETHERNET_FRAME_SIZE) {
            return;
          }

          this.bytesReceived += packet.byteLength;
          if (this.onReceiveCallback) {
            this.onReceiveCallback(packet);
          }
        } catch (err) {
          console.warn("Failed to process incoming network packet:", err);
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

      emulator.add_listener("net0-send", (packet: unknown) => {
        if (!packet) return;

        let data: Uint8Array;
        if (packet instanceof Uint8Array) {
          data = packet;
        } else if (packet instanceof ArrayBuffer) {
          data = new Uint8Array(packet);
        } else {
          return;
        }

        // Validate outbound frame bounds
        if (data.byteLength < MIN_ETHERNET_FRAME_SIZE || data.byteLength > MAX_ETHERNET_FRAME_SIZE) {
          return;
        }

        this.bytesSent += data.byteLength;
        if (this.broadcastChannel) {
          this.broadcastChannel.postMessage(data);
        }
        if (onPacketSent) {
          onPacketSent(data);
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
