import { z } from "zod";

// Used when creating a new bug (POST /teams/:teamId/bugs)
export const createBugSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  stepsToReproduce: z.array(z.string()).optional(),
  expectedResult: z.string().optional(),
  actualResult: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  assignee: z.string().optional(), // a user id, validated for real membership in the controller
});

// Used when changing a bug's status (PATCH /bugs/:id/status)
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