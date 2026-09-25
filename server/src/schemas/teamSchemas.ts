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

// Validates the request body when adding a member to a team
export const addMemberSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(["admin", "developer", "qa"]).optional(),
});

// Validates the request body when changing a member's role
export const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "developer", "qa"]),
});