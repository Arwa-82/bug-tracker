import { Router } from "express";
import {
  getTeamBugs,
  createBug,
  getBug,
  updateBugStatus,
} from "../controllers/bugs";
import { requireAuth } from "../middleware/auth";
import { requireTeamMember } from "../middleware/requireTeamMember";
import { validate } from "../middleware/validate";
import { createBugSchema, updateStatusSchema } from "../schemas/bugSchemas";

// mergeParams lets this router read :teamId from the parent route it's mounted under
const router = Router({ mergeParams: true });

// Team-scoped routes — mounted at /api/teams/:teamId/bugs in app.ts
router.get("/", requireAuth, requireTeamMember, getTeamBugs);
router.post(
  "/",
  requireAuth,
  requireTeamMember,
  validate(createBugSchema),
  createBug
);

export default router;