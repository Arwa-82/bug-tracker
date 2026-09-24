import { Router } from "express";
import { getMyTeams, createTeam, addMember } from "../controllers/teams";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createTeamSchema } from "../schemas/teamSchemas";

const router = Router();

// Every team route requires a logged-in user
router.get("/", requireAuth, getMyTeams);
router.post("/", requireAuth, validate(createTeamSchema), createTeam);
router.post("/:teamId/members", requireAuth, addMember);

export default router;