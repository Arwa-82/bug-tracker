import { z } from "zod";

// Validates the request body when creating a new team
export const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  key: z
    .string()
    .min(2, "Key must be at least 2 characters")
    .max(6, "Key must be at most 6 characters")
    .regex(/^[A-Za-z]+$/, "Key must contain only letters"),
});