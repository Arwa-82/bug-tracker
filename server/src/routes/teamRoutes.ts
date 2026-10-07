import { Router } from "express";
import {
  getMyTeams,
  createTeam,
  getTeamMembers,
  addMember,
  updateMemberRole,
  removeMember,
} from "../controllers/teams";
import { getTeamStats, getSprintReport } from "../controllers/stats";
import { requireAuth } from "../middleware/auth";
import { requireTeamMember, requireRole } from "../middleware/requireTeamMember";
import { validate } from "../middleware/validate";
import {
  createTeamSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from "../schemas/teamSchemas";

const router = Router();

router.get("/", requireAuth, getMyTeams);
router.post("/", requireAuth, validate(createTeamSchema), createTeam);

router.get("/:teamId/members", requireAuth, requireTeamMember, getTeamMembers);
router.get("/:teamId/stats", requireAuth, requireTeamMember, getTeamStats);
router.get("/:teamId/sprint-report", requireAuth, requireTeamMember, getSprintReport);

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