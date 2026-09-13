import { z } from "astro/zod";

const diskImage = z
  .strictObject({
    url: z.url(),
    size: z.number().int().positive().optional(),
    async: z.boolean().optional(),
    use_parts: z.boolean().optional(),
    fixed_chunk_size: z.number().int().positive().optional(),
  })
  .refine((image) => !image.use_parts || image.fixed_chunk_size !== undefined, "use_parts needs fixed_chunk_size");

/** The v86 constructor options an exhibit may set (spec section 4). */
export const v86BlockSchema = z
  .strictObject({
    memory_size: z.number().int().positive().optional(),
    vga_memory_size: z.number().int().positive().optional(),
    fda: diskImage.optional(),
    hda: diskImage.optional(),
    cdrom: diskImage.optional(),
    initial_state: z.strictObject({ url: z.url() }).optional(),
    acpi: z.boolean().optional(),
    boot_order: z.number().int().positive().optional(),
    cpuid_level: z.number().int().positive().optional(),
  })
  .refine((block) => Boolean(block.fda ?? block.hda ?? block.cdrom), "needs a disk: fda, hda or cdrom");

export type V86Block = z.infer<typeof v86BlockSchema>;
