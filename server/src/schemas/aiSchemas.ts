import { z } from "zod";

// Request body sent from the frontend when asking AI to draft a bug report
// from a rough, unstructured description.
export const draftBugSchema = z.object({
  rawText: z
    .string()
    .min(10, "Give at least a sentence or two to work with")
    .max(2000, "Keep it under 2000 characters"),
});

// The shape we instruct the model to return, and validate its JSON against.
// environment fields are optional/defaulted — the model won't always find
// a device or browser mentioned in the text, and that shouldn't fail the
// whole draft.
// NOTE: double-check severity/priority values exactly match the enums on
// your Bug model (bugSchemas.ts / Bug.ts) — adjust if they differ.
export const aiDraftResultSchema = z.object({
  title: z.string().min(1).max(200),
  stepsToReproduce: z.array(z.string().min(1)).min(1).max(10),
  expectedResult: z.string().min(1),
  actualResult: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]),
  priority: z.enum(["low", "medium", "high"]),
  labels: z.array(z.string().min(1)).max(5),
  environment: z
    .object({
      device: z.string().nullable().optional().default(""),
      browser: z.string().nullable().optional().default(""),
    })
    .nullable()
    .optional()
    .default({ device: "", browser: "" }),
});

export type AiDraftResult = z.infer<typeof aiDraftResultSchema>;