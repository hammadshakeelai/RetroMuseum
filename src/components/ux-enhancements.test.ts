import { describe, it, expect } from "vitest";
import { PROFILES, getProfileById } from "../profiles";
import { validateIsoUrl } from "../emulator/security";

describe("UX Enhancements & Accessibility Verification", () => {
  describe("Profiles & Custom Media", () => {
    it("ships only profiles that boot without user-supplied media", () => {
      const ids = PROFILES.map((p) => p.id);
      expect(ids).not.toContain("kali-cli");
      expect(ids).not.toContain("kali-gui");
      expect(ids).not.toContain("ubuntu-cli");
      expect(ids).not.toContain("ubuntu-gui");
      expect(ids).not.toContain("blackarch-exp");

      for (const profile of PROFILES) {
        const hasBootMedia = Boolean(
          profile.bzimageUrl || profile.stateUrl || profile.cdromUrl || profile.fdaUrl || profile.hdaUrl || profile.filesystem?.basefsUrl
        );
        expect(hasBootMedia, `${profile.id} has no boot media`).toBe(true);
      }
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
      expect(validateIsoUrl("https://example.com/alpine.iso", "http:")).toBe("https://example.com/alpine.iso");
      expect(validateIsoUrl("https://example.com/tinycore.img", "http:")).toBe("https://example.com/tinycore.img");
      expect(validateIsoUrl("https://example.com/disk.raw", "http:")).toBe("https://example.com/disk.raw");
      expect(validateIsoUrl("https://example.com/boot.bin", "http:")).toBe("https://example.com/boot.bin");
    });
  });

  describe("Profile Selector", () => {
    it("returns default profile when an unknown ID is provided", () => {
      const fallback = getProfileById("nonexistent-profile");
      expect(fallback).toBe(PROFILES[0]);
    });

    it("falls back to the default profile for removed profile links", () => {
      expect(getProfileById("kali-cli")).toBe(PROFILES[0]);
    });
  });
});
