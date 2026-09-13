import { z } from "astro/zod";

/** A disk image's file name in the site's images/ folder. */
export const FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export interface Disk {
  url: string;
  size: number;
  async?: boolean;
}

const disk = z.strictObject({
  url: z.string().regex(FILE_NAME, "must be a file name in the site's images/ folder"),
  size: z.number().int().positive(),
  async: z.boolean().optional(),
});

/** The v86 constructor options a hosted exhibit may set (spec section 4). */
export const v86BlockSchema = z
  .strictObject({
    memory_size: z.number().int().positive().optional(),
    vga_memory_size: z.number().int().positive().optional(),
    fda: disk.optional(),
    hda: disk.optional(),
    cdrom: disk.optional(),
    acpi: z.boolean().optional(),
    boot_order: z.number().int().positive().optional(),
    cpuid_level: z.number().int().positive().optional(),
  })
  .refine((block) => [block.fda, block.hda, block.cdrom].filter(Boolean).length === 1, "needs exactly one disk: fda, hda or cdrom");

export type V86Block = z.infer<typeof v86BlockSchema>;

export function diskOf(block: V86Block): Disk {
  const found = block.fda ?? block.hda ?? block.cdrom;
  if (!found) throw new Error("The v86 block has no disk");
  return found;
}

/** Where `npm run images` downloads a hosted exhibit's disk image, what it must hash to, and its license. */
export const diskImageSchema = z.strictObject({
  from: z.url(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/, "must be 64 lowercase hex characters"),
  license: z.string().min(1),
  source: z.url().optional(),
});

export type DiskImage = z.infer<typeof diskImageSchema>;
