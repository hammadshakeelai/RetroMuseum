import { describe, expect, it, vi } from "vitest";
import {
  validateIsoUrl,
  validateRelayUrl,
  validateChannelName,
  sanitizeGuestPath,
  sanitizeFilename,
  validateSnapshotBuffer,
  V86_SNAPSHOT_MAGIC,
  ZSTD_SNAPSHOT_MAGIC,
  MIN_SNAPSHOT_SIZE,
} from "./security";
import { NetworkBridge } from "./networking";

describe("security: validateIsoUrl", () => {
  it("accepts valid http and https URLs on http page", () => {
    expect(validateIsoUrl("http://example.com/disk.iso", "http:")).toBe("http://example.com/disk.iso");
    expect(validateIsoUrl("https://example.com/disk.iso", "http:")).toBe("https://example.com/disk.iso");
  });

  it("blocks mixed content (http) when page is loaded on https", () => {
    expect(() => validateIsoUrl("http://example.com/disk.iso", "https:")).toThrow(/Mixed content blocked/);
    expect(validateIsoUrl("https://example.com/disk.iso", "https:")).toBe("https://example.com/disk.iso");
  });

  it("rejects dangerous or unexpected schemes", () => {
    expect(() => validateIsoUrl("javascript:alert(1)")).toThrow(/Dangerous or invalid scheme/);
    expect(() => validateIsoUrl("data:application/octet-stream;base64,AAA")).toThrow(/Dangerous or invalid scheme/);
    expect(() => validateIsoUrl("file:///etc/passwd")).toThrow(/Dangerous or invalid scheme/);
    expect(() => validateIsoUrl("blob:https://example.com/12345")).toThrow(/Dangerous or invalid scheme/);
    expect(() => validateIsoUrl("ftp://ftp.example.com/iso")).toThrow(/Dangerous or invalid scheme/);
  });

  it("rejects URLs with embedded credentials", () => {
    expect(() => validateIsoUrl("https://admin:secret@example.com/disk.iso")).toThrow(/embedded credentials/);
  });

  it("rejects invalid, missing, or empty URLs", () => {
    expect(() => validateIsoUrl("")).toThrow(/Please enter a valid ISO/);
    expect(() => validateIsoUrl("   ")).toThrow(/Please enter a valid ISO/);
    expect(() => validateIsoUrl("not-a-url")).toThrow(/Invalid URL format/);
    expect(() => validateIsoUrl("http://")).toThrow(/Invalid URL format/);
  });
});

describe("security: validateRelayUrl", () => {
  it("accepts valid ws and wss URLs on http page", () => {
    expect(validateRelayUrl("ws://relay.example.com:8080", "http:")).toBe("ws://relay.example.com:8080/");
    expect(validateRelayUrl("wss://relay.example.com/", "http:")).toBe("wss://relay.example.com/");
  });

  it("blocks unencrypted ws when page is loaded on https", () => {
    expect(() => validateRelayUrl("ws://relay.example.com/", "https:")).toThrow(/Mixed content blocked/);
    expect(validateRelayUrl("wss://relay.example.com/", "https:")).toBe("wss://relay.example.com/");
  });

  it("rejects non-WebSocket schemes", () => {
    expect(() => validateRelayUrl("http://relay.example.com/")).toThrow(/Invalid scheme/);
    expect(() => validateRelayUrl("javascript:alert(1)")).toThrow(/Invalid scheme/);
    expect(() => validateRelayUrl("data:text/plain,hello")).toThrow(/Invalid scheme/);
  });

  it("rejects credentials and invalid relay URLs", () => {
    expect(() => validateRelayUrl("wss://user:pass@relay.example.com/")).toThrow(/embedded credentials/);
    expect(() => validateRelayUrl("")).toThrow(/Please enter a WebSocket relay URL/);
    expect(() => validateRelayUrl("wss://")).toThrow(/Invalid WebSocket URL/);
    expect(() => validateRelayUrl("wss:///")).toThrow(/Invalid WebSocket URL/);
  });
});

describe("security: validateChannelName", () => {
  it("accepts valid mesh channel names", () => {
    expect(validateChannelName("webos-lab-mesh")).toBe("webos-lab-mesh");
    expect(validateChannelName("lab_room.42")).toBe("lab_room.42");
  });

  it("rejects empty names, invalid characters, or names exceeding 64 chars", () => {
    expect(() => validateChannelName("")).toThrow(/cannot be empty/);
    expect(() => validateChannelName("   ")).toThrow(/cannot be empty/);
    expect(() => validateChannelName("bad channel name with spaces")).toThrow(/1-64 characters/);
    expect(() => validateChannelName("bad/channel<script>")).toThrow(/1-64 characters/);
    expect(() => validateChannelName("a".repeat(65))).toThrow(/1-64 characters/);
  });
});

describe("security: sanitizeGuestPath", () => {
  it("normalizes standard guest file paths inside sharedDirectory", () => {
    const res = sanitizeGuestPath("/mnt/test.txt", "/mnt");
    expect(res.fullPath).toBe("/mnt/test.txt");
    expect(res.destination).toBe("/test.txt");
  });

  it("collapses redundant slashes", () => {
    const res = sanitizeGuestPath("/mnt//subdir///test.txt", "/mnt");
    expect(res.fullPath).toBe("/mnt/subdir/test.txt");
    expect(res.destination).toBe("/subdir/test.txt");
  });

  it("prevents directory traversal escaping sharedDirectory", () => {
    expect(() => sanitizeGuestPath("/mnt/../etc/passwd", "/mnt")).toThrow(/Use a path inside \/mnt\//);
    expect(() => sanitizeGuestPath("/mnt/dir/../../root/evil.sh", "/mnt")).toThrow(/Use a path inside \/mnt\//);
    expect(() => sanitizeGuestPath("/mnt/..", "/mnt")).toThrow(/target filename cannot be empty/);
  });

  it("rejects null bytes and empty paths", () => {
    expect(() => sanitizeGuestPath("/mnt/file\0.txt", "/mnt")).toThrow(/null bytes/);
    expect(() => sanitizeGuestPath("", "/mnt")).toThrow(/cannot be empty/);
  });

  it("rejects relative traversal escaping parent when sharedDirectory is not set", () => {
    expect(() => sanitizeGuestPath("../evil.sh")).toThrow(/Directory traversal detected/);
    expect(sanitizeGuestPath("script.sh").fullPath).toBe("/script.sh");
  });
});

describe("security: sanitizeFilename", () => {
  it("strips path traversal sequences and separators from uploaded file names", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("C:\\Windows\\System32\\calc.exe")).toBe("calc.exe");
    expect(sanitizeFilename("/var/log/syslog")).toBe("syslog");
    expect(sanitizeFilename("..hello.sh")).toBe("hello.sh");
  });

  it("rejects empty names or pure traversal dots", () => {
    expect(() => sanitizeFilename("")).toThrow(/cannot be empty/);
    expect(() => sanitizeFilename("..")).toThrow(/invalid traversal/);
    expect(() => sanitizeFilename(".")).toThrow(/invalid traversal/);
    expect(() => sanitizeFilename("file\0name")).toThrow(/null bytes/);
  });
});

describe("security: validateSnapshotBuffer", () => {
  it("accepts valid uncompressed v86 snapshot", () => {
    const buf = new ArrayBuffer(MIN_SNAPSHOT_SIZE);
    new DataView(buf).setUint32(0, V86_SNAPSHOT_MAGIC, true);
    expect(() => validateSnapshotBuffer(buf)).not.toThrow();
    expect(() => validateSnapshotBuffer(buf, { requireUncompressed: true })).not.toThrow();
  });

  it("accepts valid zstd-compressed snapshot when uncompressed is not strictly required", () => {
    const buf = new ArrayBuffer(MIN_SNAPSHOT_SIZE);
    new DataView(buf).setUint32(0, ZSTD_SNAPSHOT_MAGIC, true);
    expect(() => validateSnapshotBuffer(buf)).not.toThrow();
    expect(() => validateSnapshotBuffer(buf, { requireUncompressed: true })).toThrow(/not an uncompressed/);
  });

  it("rejects empty, truncated, or oversized buffers", () => {
    expect(() => validateSnapshotBuffer(new ArrayBuffer(0))).toThrow(/empty/);
    expect(() => validateSnapshotBuffer(new ArrayBuffer(8))).toThrow(/too small/);
    // Non ArrayBuffer
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => validateSnapshotBuffer("not-a-buffer" as any)).toThrow(/expected an ArrayBuffer/);
  });

  it("rejects buffers with unrecognized magic header", () => {
    const buf = new ArrayBuffer(MIN_SNAPSHOT_SIZE);
    new DataView(buf).setUint32(0, 0x12345678, true);
    expect(() => validateSnapshotBuffer(buf)).toThrow(/unrecognized magic header/);
  });
});

describe("security: NetworkBridge BroadcastChannel packet validation", () => {
  it("drops non-binary, runt (<14 bytes), and oversized (>64KB) packets", () => {
    const received: Uint8Array[] = [];
    let messageListener: ((ev: MessageEvent) => void) | null = null;

    class MockBroadcastChannel {
      close = vi.fn();
      set onmessage(fn: ((ev: MessageEvent) => void) | null) {
        messageListener = fn;
      }
      get onmessage(): ((ev: MessageEvent) => void) | null {
        return messageListener;
      }
    }

    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);

    const bridge = new NetworkBridge({ mode: "inbrowser", channelName: "test-mesh" });
    const fakeEmulator = {
      bus: {
        send: vi.fn((_channel: string, packet: Uint8Array) => received.push(packet)),
      },
      add_listener: vi.fn(),
    };

    bridge.bindToEmulator(fakeEmulator);
    expect(messageListener).toBeDefined();

    // 1. Valid Ethernet frame (e.g. 64 bytes)
    const validPacket = new Uint8Array(64);
    messageListener!({ data: validPacket } as MessageEvent);
    expect(received.length).toBe(1);
    expect(bridge.bytesReceived).toBe(64);

    // 2. Runt frame (< 14 bytes) -> dropped
    const runtPacket = new Uint8Array(10);
    messageListener!({ data: runtPacket } as MessageEvent);
    expect(received.length).toBe(1); // not incremented

    // 3. Oversized packet (> 65536 bytes) -> dropped
    const oversized = new Uint8Array(70000);
    messageListener!({ data: oversized } as MessageEvent);
    expect(received.length).toBe(1); // not incremented

    // 4. Non-binary packet (string / object) -> dropped
    messageListener!({ data: "malicious string payload" } as unknown as MessageEvent);
    messageListener!({ data: { type: "exploit", payload: 123 } } as unknown as MessageEvent);
    expect(received.length).toBe(1); // not incremented

    // 5. Valid ArrayBuffer (60 bytes) -> converted and accepted
    const ab = new ArrayBuffer(60);
    messageListener!({ data: ab } as MessageEvent);
    expect(received.length).toBe(2);
    expect(bridge.bytesReceived).toBe(124);

    bridge.destroy();
    vi.unstubAllGlobals();
  });
});
