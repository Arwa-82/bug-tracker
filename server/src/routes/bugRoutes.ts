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

/**
 * @openapi
 * /api/teams/{teamId}/bugs:
 *   get:
 *     summary: List all bugs on a team's board
 *     tags: [Bugs]
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The team's bugs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bugs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Bug'
 *       403:
 *         description: Not a member of this team
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/", requireAuth, requireTeamMember, getTeamBugs);

/**
 * @openapi
 * /api/teams/{teamId}/bugs:
 *   post:
 *     summary: Create a new bug on a team's board
 *     tags: [Bugs]
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Safari login hangs after password change
 *               description:
 *                 type: string
 *               stepsToReproduce:
 *                 type: array
 *                 items:
 *                   type: string
 *               expectedResult:
 *                 type: string
 *               actualResult:
 *                 type: string
 *               environment:
 *                 type: object
 *                 properties:
 *                   device:
 *                     type: string
 *                   browser:
 *                     type: string
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               assignee:
 *                 type: string
 *                 description: User id, optional
 *               labels:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Bug created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bug'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not a member of this team
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/",
  requireAuth,
  requireTeamMember,
  validate(createBugSchema),
  createBug
);

export default router;