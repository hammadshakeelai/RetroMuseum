import { describe, expect, it } from "vitest";
import { diskImageSchema, diskOf, v86BlockSchema } from "./v86-block.ts";

const helenos = {
  memory_size: 268435456,
  cdrom: { url: "HelenOS-0.14.1-ia32.iso", size: 25792512, async: false },
};

describe("v86BlockSchema", () => {
  it("accepts a hosted profile with ACPI, a boot order and a CPUID level", () => {
    expect(v86BlockSchema.safeParse({ ...helenos, acpi: true, boot_order: 531, cpuid_level: 2 }).success).toBe(true);
  });

  it("rejects snapshots, split images and keys only v86's site uses", () => {
    const rejected = [
      { ...helenos, initial_state: { url: "helenos_state.bin" } },
      { ...helenos, state: { url: "helenos_state.bin" } },
      { ...helenos, mac_address_translation: true },
      { cdrom: { ...helenos.cdrom, use_parts: true } },
      { cdrom: { ...helenos.cdrom, fixed_chunk_size: 1048576 } },
    ];
    for (const block of rejected) expect(v86BlockSchema.safeParse(block).success).toBe(false);
  });

  it("needs exactly one disk", () => {
    expect(v86BlockSchema.safeParse({ memory_size: 268435456 }).success).toBe(false);
    expect(v86BlockSchema.safeParse({ fda: { url: "a.img", size: 512 }, hda: { url: "b.img", size: 512 } }).success).toBe(false);
  });

  it("needs the disk's size", () => {
    expect(v86BlockSchema.safeParse({ fda: { url: "tetros.img" } }).success).toBe(false);
  });

  it("takes a file name, not a URL or a path", () => {
    for (const url of ["https://i.copy.sh/tetros.img", "../tetros.img", "images/tetros.img", ".tetros.img"]) {
      expect(v86BlockSchema.safeParse({ fda: { url, size: 512 } }).success).toBe(false);
    }
  });
});

describe("diskOf", () => {
  it("returns the one disk", () => {
    expect(diskOf(helenos)).toEqual(helenos.cdrom);
    expect(diskOf({ fda: { url: "tetros.img", size: 512 } })).toEqual({ url: "tetros.img", size: 512 });
  });
});

describe("diskImageSchema", () => {
  const image = {
    from: "https://raw.githubusercontent.com/daniel-e/tetros/f0ebf20cd7bf81c8f7bbd3500892257057b0cee4/tetros.img",
    sha256: "fb9c23e1ffbe25ee35e2dd5a4f60c7e79710d0319ffa83da89fe0dd8a79f293c",
    license: "MIT",
  };

  it("accepts an origin, a hash and a license, with or without a source", () => {
    expect(diskImageSchema.safeParse(image).success).toBe(true);
    expect(diskImageSchema.safeParse({ ...image, source: "https://github.com/daniel-e/tetros" }).success).toBe(true);
  });

  it("rejects a bad hash, a missing license and an origin that isn't a URL", () => {
    expect(diskImageSchema.safeParse({ ...image, sha256: image.sha256.toUpperCase() }).success).toBe(false);
    expect(diskImageSchema.safeParse({ ...image, sha256: image.sha256.slice(1) }).success).toBe(false);
    expect(diskImageSchema.safeParse({ from: image.from, sha256: image.sha256 }).success).toBe(false);
    expect(diskImageSchema.safeParse({ ...image, from: "tetros.img" }).success).toBe(false);
  });
});
