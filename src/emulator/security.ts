/**
 * Security and resilience utilities for WebOS Browser Linux Lab.
 * Enforces URL scheme restrictions, mixed-content prevention,
 * filesystem path traversal defenses, and snapshot integrity checks.
 */

export const V86_SNAPSHOT_MAGIC = 0x86768676; // Uncompressed v86 snapshot magic ('v\x86v\x86')
export const ZSTD_SNAPSHOT_MAGIC = 0xFD2FB528; // Zstandard compressed snapshot magic (\x28\xb5\x2f\xfd)
export const MIN_SNAPSHOT_SIZE = 16;
export const MAX_SNAPSHOT_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB safe limit

export const MIN_ETHERNET_FRAME_SIZE = 14; // Minimum Ethernet header size (dst MAC + src MAC + EtherType)
export const MAX_ETHERNET_FRAME_SIZE = 65536; // 64 KB maximum MTU / jumbo frame limit
export const MAX_CHANNEL_NAME_LENGTH = 64;

export const MAX_GUEST_FILE_SIZE = 128 * 1024 * 1024; // 128 MB upload limit to prevent OOM
export const MAX_TERMINAL_INPUT_LENGTH = 65536; // 64 KB terminal keystroke paste limit

/**
 * Validates a remote ISO URL for MountMediaModal.
 * Enforces HTTP/HTTPS scheme restrictions, prevents mixed content when on HTTPS,
 * rejects embedded credentials, and verifies hostname presence.
 */
export function validateIsoUrl(rawUrl: string, currentProtocol?: string): string {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) {
    throw new Error("Please enter a valid ISO / disk image URL.");
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Invalid URL format. Please provide a complete URL starting with http:// or https://.");
  }

  // Reject dangerous schemes (javascript:, data:, file:, blob:, ftp:, etc.)
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Dangerous or invalid scheme: only HTTP and HTTPS ISO URLs are allowed.");
  }

  // Prevent mixed content when running on HTTPS
  const pageProtocol = currentProtocol || (typeof window !== "undefined" ? window.location.protocol : "http:");
  if (pageProtocol === "https:" && url.protocol !== "https:") {
    throw new Error("Mixed content blocked: this page is loaded over HTTPS, so ISO URLs must use HTTPS.");
  }

  if (!url.hostname) {
    throw new Error("ISO URL must include a valid hostname.");
  }

  if (url.username || url.password) {
    throw new Error("URLs containing embedded credentials (user:pass@) are not permitted.");
  }

  return url.href;
}

/**
 * Validates a WebSocket relay URL for NetworkModal.
 * Enforces ws/wss scheme restrictions, prevents mixed content on HTTPS,
 * rejects embedded credentials, and verifies hostname presence.
 */
export function validateRelayUrl(rawUrl: string, currentProtocol?: string): string {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) {
    throw new Error("Please enter a WebSocket relay URL.");
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Invalid WebSocket URL format. Must start with ws:// or wss://.");
  }

  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new Error("Invalid scheme: WebSocket relay URL must use ws:// or wss://.");
  }

  const pageProtocol = currentProtocol || (typeof window !== "undefined" ? window.location.protocol : "http:");
  if (pageProtocol === "https:" && url.protocol !== "wss:") {
    throw new Error("Mixed content blocked: HTTPS pages require an encrypted WebSocket relay URL (wss://).");
  }

  if (!url.hostname) {
    throw new Error("WebSocket relay URL must include a valid hostname.");
  }

  if (url.username || url.password) {
    throw new Error("URLs containing embedded credentials (user:pass@) are not permitted.");
  }

  return url.href;
}

/**
 * Validates and sanitizes a BroadcastChannel mesh network channel name.
 */
export function validateChannelName(name: string): string {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    throw new Error("Mesh channel name cannot be empty.");
  }
  if (!/^[a-zA-Z0-9_.-]{1,64}$/.test(trimmed)) {
    throw new Error(
      "Mesh channel name must be 1-64 characters and contain only letters, numbers, hyphens, underscores, or dots."
    );
  }
  return trimmed;
}

/**
 * Normalizes and validates a guest filesystem path, preventing directory traversal.
 * Resolves '.' and '..' components, collapses redundant slashes, and checks that
 * the target remains within the designated shared directory (if specified).
 *
 * @param rawPath The raw path string from user input or dropped file.
 * @param sharedDirectory Optional shared directory root (e.g. "/mnt").
 * @returns The normalized destination path for 9P creation (relative to 9P root if sharedDirectory was used).
 */
export function sanitizeGuestPath(
  rawPath: string,
  sharedDirectory?: string
): { fullPath: string; destination: string } {
  if (typeof rawPath !== "string" || !rawPath.trim()) {
    throw new Error("Invalid file path: path cannot be empty.");
  }
  if (rawPath.includes("\0")) {
    throw new Error("Invalid file path: null bytes are not allowed.");
  }

  // Replace backslashes with forward slashes and collapse duplicate slashes
  const clean = rawPath.replace(/\\/g, "/").replace(/\/+/g, "/");
  const isAbsolute = clean.startsWith("/");
  const segments = clean.split("/").filter(Boolean);
  const resolved: string[] = [];

  for (const seg of segments) {
    if (seg === ".") {
      continue;
    }
    if (seg === "..") {
      if (resolved.length > 0) {
        resolved.pop();
      } else if (!isAbsolute) {
        throw new Error("Directory traversal detected: path attempts to escape parent directory.");
      }
      continue;
    }
    resolved.push(seg);
  }

  if (resolved.length === 0) {
    throw new Error("Invalid file path: target filename cannot be empty.");
  }

  const normalizedFullPath = "/" + resolved.join("/");

  if (sharedDirectory) {
    const cleanRoot = "/" + sharedDirectory.replace(/\\/g, "/").split("/").filter(Boolean).join("/");
    const prefix = cleanRoot + "/";
    if (!normalizedFullPath.startsWith(prefix)) {
      throw new Error(`Use a path inside ${cleanRoot}/ for this VM.`);
    }
    // Destination inside 9P is relative to the shared root
    const destination = normalizedFullPath.slice(cleanRoot.length);
    return { fullPath: normalizedFullPath, destination };
  }

  return { fullPath: normalizedFullPath, destination: normalizedFullPath };
}

/**
 * Sanitizes a host filename uploaded via file input or drag-and-drop,
 * stripping directory components and traversal sequences.
 */
export function sanitizeFilename(rawName: string): string {
  if (!rawName || typeof rawName !== "string") {
    throw new Error("Invalid filename: filename cannot be empty.");
  }
  if (rawName.includes("\0")) {
    throw new Error("Invalid filename: null bytes are not allowed.");
  }

  // Strip path prefixes (Windows and Unix)
  const baseName = rawName.replace(/^.*[/\\]/, "").replace(/^\.+/, "").trim();
  if (!baseName || baseName === "." || baseName === "..") {
    throw new Error("Invalid filename: filename contains invalid traversal characters.");
  }
  return baseName;
}

/**
 * Validates a VM state snapshot buffer for integrity and bounds safety.
 * Verifies that the buffer is an ArrayBuffer, not empty, meets minimum and maximum
 * size bounds, and contains a valid v86 magic header.
 */
export function validateSnapshotBuffer(
  buffer: ArrayBuffer,
  options: { requireUncompressed?: boolean } = {}
): void {
  if (!buffer || !(buffer instanceof ArrayBuffer)) {
    throw new Error("Invalid snapshot data: expected an ArrayBuffer.");
  }
  if (buffer.byteLength === 0) {
    throw new Error("The snapshot buffer is empty.");
  }
  if (buffer.byteLength < MIN_SNAPSHOT_SIZE) {
    throw new Error(
      `Snapshot buffer is too small (minimum ${MIN_SNAPSHOT_SIZE} bytes required, got ${buffer.byteLength}).`
    );
  }
  if (buffer.byteLength > MAX_SNAPSHOT_SIZE) {
    throw new Error(
      `Snapshot buffer exceeds maximum allowed size (${MAX_SNAPSHOT_SIZE / (1024 * 1024 * 1024)} GB).`
    );
  }

  const magic = new DataView(buffer).getUint32(0, true);
  if (options.requireUncompressed) {
    if (magic !== V86_SNAPSHOT_MAGIC) {
      throw new Error("This file is not an uncompressed v86 memory snapshot.");
    }
  } else if (magic !== V86_SNAPSHOT_MAGIC && magic !== ZSTD_SNAPSHOT_MAGIC) {
    throw new Error("Invalid snapshot: unrecognized magic header.");
  }
}
