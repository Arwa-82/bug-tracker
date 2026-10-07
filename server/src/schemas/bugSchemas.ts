import { z } from "zod";

export const createBugSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  stepsToReproduce: z.array(z.string()).optional(),
  expectedResult: z.string().optional(),
  actualResult: z.string().optional(),
  environment: z
    .object({
      device: z.string().optional(),
      browser: z.string().optional(),
    })
    .optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  assignee: z.string().optional(),
  labels: z.array(z.string()).optional(),
});

export const updateBugSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  stepsToReproduce: z.array(z.string()).optional(),
  expectedResult: z.string().optional(),
  actualResult: z.string().optional(),
  environment: z
    .object({
      device: z.string().optional(),
      browser: z.string().optional(),
    })
    .optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  labels: z.array(z.string()).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum([
    "open",
    "in_progress",
    "fixed",
    "verified",
    "closed",
    "reopened",
  ]),
});

export const assignBugSchema = z.object({
  assignee: z.string().nullable(),
});

// Used when linking one bug to another
export const linkBugSchema = z.object({
  linkedBugId: z.string().min(1, "linkedBugId is required"),
});