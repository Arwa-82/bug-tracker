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
import { requireTeamMember, requireRole } from "../middleware/requireTeamMember";
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

// Anyone on the team can VIEW the member list
router.get("/:teamId/members", requireAuth, requireTeamMember, getTeamMembers);

// Only admins can add, change roles, or remove members
router.post(
  "/:teamId/members",
  requireAuth,
  requireTeamMember,
  requireRole("admin"),
  validate(addMemberSchema),
  addMember
);
router.patch(
  "/:teamId/members/:userId",
  requireAuth,
  requireTeamMember,
  requireRole("admin"),
  validate(updateMemberRoleSchema),
  updateMemberRole
);
router.delete(
  "/:teamId/members/:userId",
  requireAuth,
  requireTeamMember,
  requireRole("admin"),
  removeMember
);

export default router;