// Type definitions for v86 and VM profiles

export interface VMProfile {
  id: string;
  name: string;
  category: "arch" | "micro" | "dsl" | "kolibri" | "freedos" | "custom";
  mode: "cli" | "gui";
  description: string;
  tagline: string;
  memorySize: number; // in bytes, e.g. 512 * 1024 * 1024
  vgaMemorySize: number; // in bytes
  biosUrl?: string;
  vgaBiosUrl?: string;
  cdromUrl?: string;
  cdromBuffer?: ArrayBuffer;
  hdaUrl?: string;
  hdaSize?: number;
  fdaUrl?: string;
  bzimageUrl?: string;
  initrdUrl?: string;
  cmdline?: string;
  stateUrl?: string; // Pre-saved RAM snapshot for sub-second boots (.bin / .bin.zst)
  sharedDirectory?: string;
  filesystem?: {
    basefsUrl?: string;
    baseurl?: string;
  };
  netDevice?: "virtio" | "ne2k";
  isExperimental?: boolean;
  recommended?: boolean;
}

export type VMStatus = "idle" | "booting" | "running" | "paused" | "saving" | "restoring" | "error";

export interface VMStats {
  ips: number; // Instructions per second
  mips: string; // Formatted MIPS
  uptimeSeconds: number;
  bytesReceived: number;
  bytesSent: number;
  memoryMB: number;
  vgaMemoryMB: number;
}

export interface VMSnapshot {
  id: string;
  profileId: string;
  profileName: string;
  timestamp: number;
  label: string;
  sizeBytes: number;
  data: ArrayBuffer;
}

export type NetworkMode = "offline" | "inbrowser" | "wsproxy";

export interface NetworkConfig {
  mode: NetworkMode;
  channelName: string; // For BroadcastChannel (e.g. "webos-lab-mesh")
  relayUrl?: string; // For WebSocket proxy (e.g. "wss://relay.widgetry.org/")
}
