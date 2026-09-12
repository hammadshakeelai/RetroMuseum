import { describe, it, expect } from "vitest";
import { PROFILES, getProfileById } from "../profiles";
import { validateIsoUrl } from "../emulator/security";

describe("UX Enhancements & Accessibility Verification", () => {
  describe("Profiles & Custom Media Specs", () => {
    it("flags Kali, Ubuntu, and BlackArch profiles as needing custom media", () => {
      const kaliCli = getProfileById("kali-cli");
      const kaliGui = getProfileById("kali-gui");
      const ubuntuCli = getProfileById("ubuntu-cli");
      const ubuntuGui = getProfileById("ubuntu-gui");
      const blackarch = getProfileById("blackarch-exp");

      expect(kaliCli.needsCustomMedia).toBe(true);
      expect(kaliGui.needsCustomMedia).toBe(true);
      expect(ubuntuCli.needsCustomMedia).toBe(true);
      expect(ubuntuGui.needsCustomMedia).toBe(true);
      expect(blackarch.needsCustomMedia).toBe(true);

      expect(kaliCli.memorySize).toBeGreaterThanOrEqual(768 * 1024 * 1024);
      expect(kaliGui.memorySize).toBeGreaterThanOrEqual(1024 * 1024 * 1024);
      expect(blackarch.memorySize).toBeGreaterThanOrEqual(768 * 1024 * 1024);
    });

    it("identifies profiles that support 9P VirtIO filesystem vs CDROM/raw", () => {
      const micro = getProfileById("micro-sandbox");
      const archCli = getProfileById("arch-cli");
      const dsl = getProfileById("dsl-gui");
      const linux4 = getProfileById("linux4-cli");

      expect(Boolean(micro.filesystem)).toBe(true);
      expect(Boolean(archCli.filesystem)).toBe(true);
      expect(Boolean(dsl.filesystem)).toBe(false);
      expect(Boolean(linux4.filesystem)).toBe(false);
    });

    it("validates custom media image URLs (.iso, .img, .bin, .raw)", () => {
      expect(validateIsoUrl("https://example.com/custom-kali.iso", "http:")).toBe("https://example.com/custom-kali.iso");
      expect(validateIsoUrl("https://example.com/ubuntu-mini.img", "http:")).toBe("https://example.com/ubuntu-mini.img");
      expect(validateIsoUrl("https://example.com/disk.raw", "http:")).toBe("https://example.com/disk.raw");
      expect(validateIsoUrl("https://example.com/boot.bin", "http:")).toBe("https://example.com/boot.bin");
    });
  });

  describe("Profile Selector", () => {
    it("returns default profile when an unknown ID is provided", () => {
      const fallback = getProfileById("nonexistent-profile");
      expect(fallback).toBe(PROFILES[0]);
    });
  });
});
