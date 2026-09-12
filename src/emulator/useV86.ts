import { useState, useEffect, useRef, useCallback } from "react";
import type { VMProfile, VMStatus, VMStats, NetworkConfig } from "./types";
import { V86Engine } from "./V86Engine";
import { saveSnapshot } from "./storage";

interface UseV86Props {
  initialProfile: VMProfile;
  initialNetwork?: NetworkConfig;
}

export function useV86({ initialProfile, initialNetwork }: UseV86Props) {
  const [profile, setProfile] = useState<VMProfile>(initialProfile);
  const [status, setStatus] = useState<VMStatus>("idle");
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig>(
    initialNetwork || { mode: "inbrowser", channelName: "webos-lab-mesh" }
  );
  const [stats, setStats] = useState<VMStats>({
    ips: 0,
    mips: "0.0",
    uptimeSeconds: 0,
    bytesReceived: 0,
    bytesSent: 0,
    memoryMB: Math.round(initialProfile.memorySize / (1024 * 1024)),
    vgaMemoryMB: Math.round(initialProfile.vgaMemorySize / (1024 * 1024)),
  });
  const [error, setError] = useState<string | null>(null);
  const [serialLogs, setSerialLogs] = useState<string>("");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<V86Engine | null>(null);

  const startVM = useCallback(
    async (targetProfile?: VMProfile, customBuffer?: ArrayBuffer) => {
      const activeProfile = targetProfile || profile;
      if (!containerRef.current) return;

      setError(null);
      if (engineRef.current) {
        await engineRef.current.destroy();
      }

      const engine = new V86Engine(activeProfile, networkConfig, {
        onStatusChange: (newStatus) => setStatus(newStatus),
        onStatsUpdate: (newStats) => setStats(newStats),
        onError: (err) => setError(err.message),
        onSerialOutput: (char) => {
          setSerialLogs((prev) => (prev.length > 50000 ? prev.slice(10000) + char : prev + char));
        },
      });

      engineRef.current = engine;
      try {
        await engine.start(containerRef.current, customBuffer);
      } catch (err) {
        console.error("VM Start error:", err);
      }
    },
    [profile, networkConfig]
  );

  const pauseVM = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.pause();
    }
  }, []);

  const resumeVM = useCallback(async () => {
    if (engineRef.current) {
      await engineRef.current.resume();
    }
  }, []);

  const restartVM = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.restart();
    }
  }, []);

  const resetFactoryClean = useCallback(async () => {
    await startVM(profile);
  }, [profile, startVM]);

  const saveVMSnapshot = useCallback(
    async (label: string) => {
      if (!engineRef.current) throw new Error("No VM running");
      const buffer = await engineRef.current.saveState();
      return await saveSnapshot(profile.id, profile.name, label, buffer);
    },
    [profile]
  );

  const restoreVMSnapshot = useCallback(
    async (buffer: ArrayBuffer) => {
      if (engineRef.current && status !== "idle") {
        await engineRef.current.restoreState(buffer);
      } else {
        await startVM(profile, buffer);
      }
    },
    [profile, status, startVM]
  );

  const sendKey = useCallback((scancodes: number[]) => {
    if (engineRef.current) {
      engineRef.current.sendKeyCodes(scancodes);
    }
  }, []);

  const sendCommandText = useCallback((text: string) => {
    if (engineRef.current) {
      engineRef.current.sendText(text);
    }
  }, []);

  const takeScreenshot = useCallback(() => {
    if (engineRef.current) {
      return engineRef.current.captureScreenshot();
    }
    return null;
  }, []);

  const uploadGuestFile = useCallback(async (path: string, data: Uint8Array) => {
    if (engineRef.current) {
      await engineRef.current.createFileInGuest(path, data);
    }
  }, []);

  const switchProfile = useCallback(
    async (newProfile: VMProfile) => {
      setProfile(newProfile);
      setStats({
        ips: 0,
        mips: "0.0",
        uptimeSeconds: 0,
        bytesReceived: 0,
        bytesSent: 0,
        memoryMB: Math.round(newProfile.memorySize / (1024 * 1024)),
        vgaMemoryMB: Math.round(newProfile.vgaMemorySize / (1024 * 1024)),
      });
      await startVM(newProfile);
    },
    [startVM]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, []);

  return {
    profile,
    status,
    stats,
    error,
    networkConfig,
    serialLogs,
    containerRef,
    setNetworkConfig,
    startVM,
    pauseVM,
    resumeVM,
    restartVM,
    resetFactoryClean,
    saveVMSnapshot,
    restoreVMSnapshot,
    sendKey,
    sendCommandText,
    takeScreenshot,
    uploadGuestFile,
    switchProfile,
    clearSerialLogs: () => setSerialLogs(""),
  };
}
