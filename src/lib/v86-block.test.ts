import { describe, expect, it } from "vitest";
import { v86BlockSchema } from "./v86-block.ts";

const windows95 = {
  memory_size: 67108864,
  hda: { url: "https://i.copy.sh/windows95-v3/.img", size: 471859200, async: true, fixed_chunk_size: 262144, use_parts: true },
};

describe("v86BlockSchema", () => {
  it("accepts a v86 profile", () => {
    expect(v86BlockSchema.safeParse(windows95).success).toBe(true);
  });

  it("accepts a snapshot, ACPI and a CPUID level", () => {
    const block = { ...windows95, initial_state: { url: "https://i.copy.sh/x.bin.zst" }, acpi: true, cpuid_level: 2 };
    expect(v86BlockSchema.safeParse(block).success).toBe(true);
  });

  it("rejects keys v86's site uses that the page doesn't pass on", () => {
    expect(v86BlockSchema.safeParse({ ...windows95, state: { url: "https://i.copy.sh/x.bin.zst" } }).success).toBe(false);
    expect(v86BlockSchema.safeParse({ ...windows95, mac_address_translation: true }).success).toBe(false);
  });

  it("needs a disk", () => {
    expect(v86BlockSchema.safeParse({ memory_size: 67108864 }).success).toBe(false);
  });

  it("needs a chunk size for a split image", () => {
    expect(v86BlockSchema.safeParse({ hda: { url: "https://i.copy.sh/a/.img", use_parts: true } }).success).toBe(false);
  });

  it("needs full URLs", () => {
    expect(v86BlockSchema.safeParse({ fda: { url: "//i.copy.sh/tetros.img" } }).success).toBe(false);
  });
});
