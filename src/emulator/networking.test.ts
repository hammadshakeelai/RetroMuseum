import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NetworkBridge } from "./networking";

describe("NetworkBridge", () => {
  let createdChannels: MockBroadcastChannel[] = [];

  class MockBroadcastChannel {
    name: string;
    onmessage: ((event: MessageEvent) => void) | null = null;
    closed = false;
    postedMessages: unknown[] = [];

    constructor(name: string) {
      this.name = name;
      createdChannels.push(this);
    }

    postMessage(data: unknown) {
      if (this.closed) throw new Error("Channel closed");
      this.postedMessages.push(data);
    }

    close() {
      this.closed = true;
    }
  }

  beforeEach(() => {
    createdChannels = [];
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not create a BroadcastChannel in offline or wsproxy mode", () => {
    const offlineBridge = new NetworkBridge({ mode: "offline", channelName: "test" });
    expect(createdChannels).toHaveLength(0);
    offlineBridge.destroy();

    const wsproxyBridge = new NetworkBridge({ mode: "wsproxy", channelName: "test", relayUrl: "wss://relay.example.com" });
    expect(createdChannels).toHaveLength(0);
    wsproxyBridge.destroy();
  });

  it("initializes BroadcastChannel with valid channel name or default fallback", () => {
    const bridge1 = new NetworkBridge({ mode: "inbrowser", channelName: "mesh-alpha_1" });
    expect(createdChannels).toHaveLength(1);
    expect(createdChannels[0].name).toBe("mesh-alpha_1");
    bridge1.destroy();

    // Invalid channel name with spaces or special characters falls back to "webos-lab-mesh"
    const bridge2 = new NetworkBridge({ mode: "inbrowser", channelName: "invalid channel name!" });
    expect(createdChannels).toHaveLength(2);
    expect(createdChannels[1].name).toBe("webos-lab-mesh");
    bridge2.destroy();
  });

  it("updates configuration cleanly, closing previous channel and resetting state", () => {
    const bridge = new NetworkBridge({ mode: "inbrowser", channelName: "first-channel" });
    const firstChannel = createdChannels[0];
    expect(firstChannel.closed).toBe(false);

    bridge.updateConfig({ mode: "inbrowser", channelName: "second-channel" });
    expect(firstChannel.closed).toBe(true);
    expect(createdChannels).toHaveLength(2);
    expect(createdChannels[1].name).toBe("second-channel");

    bridge.updateConfig({ mode: "offline", channelName: "second-channel" });
    expect(createdChannels[1].closed).toBe(true);
    bridge.destroy();
  });

  it("binds to emulator in inbrowser mode and forwards net0-send packets to broadcast channel", () => {
    const bridge = new NetworkBridge({ mode: "inbrowser", channelName: "mesh-test" });
    const listeners = new Map<string, (packet: unknown) => void>();
    const emulator = {
      bus: { send: vi.fn() },
      add_listener: (event: string, cb: (packet: unknown) => void) => {
        listeners.set(event, cb);
      },
    };
    const onPacketSent = vi.fn();

    bridge.bindToEmulator(emulator, onPacketSent);
    expect(listeners.has("net0-send")).toBe(true);

    // Send valid Ethernet packet (64 bytes)
    const validPacket = new Uint8Array(64).fill(0xaa);
    listeners.get("net0-send")!(validPacket);

    expect(bridge.bytesSent).toBe(64);
    expect(createdChannels[0].postedMessages).toHaveLength(1);
    expect(createdChannels[0].postedMessages[0]).toEqual(validPacket);
    expect(onPacketSent).toHaveBeenCalledWith(validPacket);

    // Send valid packet wrapped in ArrayBuffer
    const ab = new Uint8Array(20).fill(0xbb).buffer;
    listeners.get("net0-send")!(ab);
    expect(bridge.bytesSent).toBe(84);
    expect(createdChannels[0].postedMessages).toHaveLength(2);

    // Drops runt frames (< 14 bytes)
    listeners.get("net0-send")!(new Uint8Array(10));
    expect(bridge.bytesSent).toBe(84);
    expect(createdChannels[0].postedMessages).toHaveLength(2);

    // Drops oversized frames (> 65536 bytes)
    listeners.get("net0-send")!(new Uint8Array(70000));
    expect(bridge.bytesSent).toBe(84);
    expect(createdChannels[0].postedMessages).toHaveLength(2);

    // Drops non-binary or falsy data
    listeners.get("net0-send")!(null);
    listeners.get("net0-send")!("string data");
    expect(bridge.bytesSent).toBe(84);

    bridge.destroy();
  });

  it("receives inbound packets from BroadcastChannel, extracts byte offset, and sends to emulator net0-receive", () => {
    const bridge = new NetworkBridge({ mode: "inbrowser", channelName: "mesh-test" });
    const emulator = {
      bus: { send: vi.fn() },
      add_listener: vi.fn(),
    };
    bridge.bindToEmulator(emulator);

    const channel = createdChannels[0];
    expect(channel.onmessage).toBeDefined();

    // Inbound full buffer packet (32 bytes)
    const packet32 = new Uint8Array(32).fill(0x12);
    channel.onmessage!({ data: packet32 } as MessageEvent);

    expect(bridge.bytesReceived).toBe(32);
    expect(emulator.bus.send).toHaveBeenCalledWith("net0-receive", packet32);

    // Inbound subarray packet with non-zero byte offset
    const bigBuf = new Uint8Array(100);
    bigBuf.set([0x42, 0x43, 0x44], 10);
    const subPacket = bigBuf.subarray(10, 30); // 20 bytes with byteOffset=10
    channel.onmessage!({ data: subPacket } as MessageEvent);

    expect(bridge.bytesReceived).toBe(52);
    expect(emulator.bus.send).toHaveBeenCalledWith("net0-receive", expect.any(Uint8Array));

    // ArrayBuffer inbound
    const ab = new ArrayBuffer(24);
    channel.onmessage!({ data: ab } as MessageEvent);
    expect(bridge.bytesReceived).toBe(76);

    // Drops non-binary or out of bounds
    channel.onmessage!({ data: "text" } as unknown as MessageEvent);
    channel.onmessage!({ data: new Uint8Array(5) } as MessageEvent); // runt
    channel.onmessage!({ data: new Uint8Array(70000) } as MessageEvent); // oversized
    channel.onmessage!({ data: null } as unknown as MessageEvent);
    expect(bridge.bytesReceived).toBe(76);

    bridge.destroy();
  });

  it("handles bus send errors gracefully without throwing", () => {
    const bridge = new NetworkBridge({ mode: "inbrowser", channelName: "mesh-test" });
    const emulator = {
      bus: {
        send: vi.fn(() => {
          throw new Error("VM memory bus failure");
        }),
      },
      add_listener: vi.fn(),
    };
    bridge.bindToEmulator(emulator);

    const channel = createdChannels[0];
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(() => {
      channel.onmessage!({ data: new Uint8Array(32) } as MessageEvent);
    }).not.toThrow();

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    bridge.destroy();
  });

  it("does not bind emulator listeners when in offline mode", () => {
    const bridge = new NetworkBridge({ mode: "offline", channelName: "mesh-test" });
    const emulator = {
      bus: { send: vi.fn() },
      add_listener: vi.fn(),
    };
    bridge.bindToEmulator(emulator);
    expect(emulator.add_listener).not.toHaveBeenCalled();
    bridge.destroy();
  });
});
