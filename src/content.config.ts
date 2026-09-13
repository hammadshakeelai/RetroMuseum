import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { exhibitKindIssue } from "./lib/exhibits.ts";
import { FAMILY_IDS } from "./lib/families.ts";
import { diskImageSchema, v86BlockSchema } from "./lib/v86-block.ts";

const exhibits = defineCollection({
  loader: glob({ base: "./src/content/exhibits", pattern: "*.md" }),
  schema: ({ image }) =>
    z
      .strictObject({
        title: z.string().min(1),
        maker: z.string().min(1),
        year: z.number().int().min(1970).max(2030),
        family: z.enum(FAMILY_IDS),
        license: z.enum(["open-source", "proprietary"]),
        summary: z.string().min(1).max(140),
        downloadEstimateMB: z.number().positive(),
        screenshotWaitSeconds: z.number().int().positive().default(120),
        screenshotInput: z.string().min(1).optional(),
        facts: z.record(z.string(), z.string()),
        tryThis: z.array(z.string().min(1)).min(1),
        homepage: z.url().optional(),
        screenshot: image(),
        sources: z.array(z.url()).min(1),
        diskImage: diskImageSchema.optional(),
        v86: v86BlockSchema.optional(),
        copyShProfile: z
          .string()
          .regex(/^[a-z0-9-]+$/)
          .optional(),
      })
      .superRefine((data, context) => {
        const issue = exhibitKindIssue(data);
        if (issue) context.addIssue({ code: "custom", message: issue });
      }),
});

export const collections = { exhibits };
