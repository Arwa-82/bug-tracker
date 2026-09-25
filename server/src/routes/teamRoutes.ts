import { Router } from "express";
import {
  getMyTeams,
  createTeam,
  getTeamMembers,
  addMember,
  updateMemberRole,
  removeMember,
} from "../controllers/teams";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createTeamSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from "../schemas/teamSchemas";

const router = Router();

// Every team route requires a logged-in user
router.get("/", requireAuth, getMyTeams);
router.post("/", requireAuth, validate(createTeamSchema), createTeam);

// Membership management
router.get("/:teamId/members", requireAuth, getTeamMembers);
router.post(
  "/:teamId/members",
  requireAuth,
  validate(addMemberSchema),
  addMember
);
router.patch(
  "/:teamId/members/:userId",
  requireAuth,
  validate(updateMemberRoleSchema),
  updateMemberRole
);
router.delete("/:teamId/members/:userId", requireAuth, removeMember);

export default router;