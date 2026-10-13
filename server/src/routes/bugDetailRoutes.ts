import { Router } from "express";
import {
  getBug,
  updateBug,
  updateBugStatus,
  assignBug,
  deleteBug,
  addBugAttachment,
  deleteBugAttachment,
  getBugActivity,
  searchBugs,
  linkBug,
  unlinkBug,
  getLinkedBugs,
} from "../controllers/bugs";
import {
  getBugComments,
  addBugComment,
  deleteComment,
} from "../controllers/comments";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  updateBugSchema,
  updateStatusSchema,
  assignBugSchema,
  linkBugSchema,
} from "../schemas/bugSchemas";
import { createCommentSchema } from "../schemas/commentSchemas";
import { upload } from "../middleware/upload";
import { draftBugSchema } from "../schemas/aiSchemas";
import { draftBug } from "../controllers/ai";

const router = Router();

// IMPORTANT: /search and /draft must be declared BEFORE /:id, otherwise
// Express would match "search"/"draft" as if they were a bug id and route
// them to getBug instead.

/**
 * @openapi
 * /api/bugs/draft:
 *   post:
 *     summary: Draft a structured bug report from rough free-text notes using a local AI model
 *     description: >
 *       Sends the given text to a locally-running Ollama model and returns a
 *       suggested structured bug report. Nothing is saved to the database —
 *       this is suggestion-only, for the user to review/edit before actually
 *       creating the bug. Requires login but not team membership.
 *     tags: [Bugs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rawText]
 *             properties:
 *               rawText:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 2000
 *                 example: when i click login on safari after changing password it just spins forever and never logs in
 *     responses:
 *       200:
 *         description: AI-suggested structured bug report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 title:
 *                   type: string
 *                 stepsToReproduce:
 *                   type: array
 *                   items:
 *                     type: string
 *                 expectedResult:
 *                   type: string
 *                 actualResult:
 *                   type: string
 *                 severity:
 *                   type: string
 *                   enum: [low, medium, high, critical]
 *                 priority:
 *                   type: string
 *                   enum: [low, medium, high]
 *                 labels:
 *                   type: array
 *                   items:
 *                     type: string
 *                 environment:
 *                   type: object
 *                   properties:
 *                     device:
 *                       type: string
 *                     browser:
 *                       type: string
 *       400:
 *         description: Validation error (rawText missing or out of length bounds)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       502:
 *         description: Couldn't reach Ollama, or the model's output wasn't usable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/draft", requireAuth, validate(draftBugSchema), draftBug);

/**
 * @openapi
 * /api/bugs/search:
 *   get:
 *     summary: Search bug titles across all teams the current user belongs to
 *     description: Minimum 2 characters, returns up to 10 results. Each result includes its team's name/key.
 *     tags: [Bugs]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *     responses:
 *       200:
 *         description: Matching bugs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bugs:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Bug'
 *                       - type: object
 *                         properties:
 *                           team:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               key:
 *                                 type: string
 */
router.get("/search", requireAuth, searchBugs);

/**
 * @openapi
 * /api/bugs/{id}:
 *   get:
 *     summary: Get a single bug's full detail
 *     tags: [Bugs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The bug
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bug'
 *       404:
 *         description: Bug not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", requireAuth, getBug);

/**
 * @openapi
 * /api/bugs/{id}:
 *   patch:
 *     summary: Update a bug's details
 *     description: Partial update — only send the fields you want to change. Logs a bug_updated activity entry naming which fields changed.
 *     tags: [Bugs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
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
 *               labels:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Updated bug
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
 */
router.patch("/:id", requireAuth, validate(updateBugSchema), updateBug);

/**
 * @openapi
 * /api/bugs/{id}/status:
 *   patch:
 *     summary: Change a bug's status
 *     description: >
 *       Enforced workflow: open → in_progress → fixed → verified → closed,
 *       with reopened available from fixed/verified/closed. Invalid
 *       transitions are rejected server-side. Only QA/Admin can set
 *       "verified"; only Admin can reopen a "closed" bug.
 *     tags: [Bugs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, in_progress, fixed, verified, closed, reopened]
 *     responses:
 *       200:
 *         description: Status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bug'
 *       400:
 *         description: Invalid transition for the bug's current status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Role not permitted to make this transition
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  "/:id/status",
  requireAuth,
  validate(updateStatusSchema),
  updateBugStatus
);

/**
 * @openapi
 * /api/bugs/{id}/assign:
 *   patch:
 *     summary: Assign or unassign a bug
 *     description: assignee must be a member of the bug's team, or null to unassign.
 *     tags: [Bugs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assignee]
 *             properties:
 *               assignee:
 *                 type: string
 *                 nullable: true
 *                 description: User id to assign, or null to unassign
 *     responses:
 *       200:
 *         description: Updated bug
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bug'
 *       400:
 *         description: Assignee is not a member of this bug's team
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/:id/assign", requireAuth, validate(assignBugSchema), assignBug);

/**
 * @openapi
 * /api/bugs/{id}:
 *   delete:
 *     summary: Delete a bug
 *     description: Reporter or team Admin only.
 *     tags: [Bugs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bug deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       403:
 *         description: Not the reporter or an admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id", requireAuth, deleteBug);

/**
 * @openapi
 * /api/bugs/{id}/activity:
 *   get:
 *     summary: Get a bug's activity log
 *     tags: [Bugs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The bug's activity entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activity:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Activity'
 */
router.get("/:id/activity", requireAuth, getBugActivity);

/**
 * @openapi
 * /api/bugs/{id}/links:
 *   get:
 *     summary: Get a bug's linked issues
 *     description: Filters out any linked bug whose team the requester isn't a member of.
 *     tags: [Bugs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Linked bugs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bugs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Bug'
 */
router.get("/:id/links", requireAuth, getLinkedBugs);

/**
 * @openapi
 * /api/bugs/{id}/links:
 *   post:
 *     summary: Link this bug to another bug (possibly on a different team)
 *     description: Requires the requester to be a member of BOTH teams. Rejects self-links and duplicate links. Link is bidirectional.
 *     tags: [Bugs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [linkedBugId]
 *             properties:
 *               linkedBugId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bugs linked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bug'
 *       400:
 *         description: Self-link or already-linked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Not a member of both teams
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/:id/links", requireAuth, validate(linkBugSchema), linkBug);

/**
 * @openapi
 * /api/bugs/{id}/links/{linkedBugId}:
 *   delete:
 *     summary: Remove a link between two bugs
 *     tags: [Bugs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: linkedBugId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Link removed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
router.delete("/:id/links/:linkedBugId", requireAuth, unlinkBug);

/**
 * @openapi
 * /api/bugs/{id}/comments:
 *   get:
 *     summary: Get a bug's comments
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The bug's comments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comments:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Comment'
 */
router.get("/:id/comments", requireAuth, getBugComments);

/**
 * @openapi
 * /api/bugs/{id}/comments:
 *   post:
 *     summary: Add a comment to a bug
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 */
router.post(
  "/:id/comments",
  requireAuth,
  validate(createCommentSchema),
  addBugComment
);

/**
 * @openapi
 * /api/bugs/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment
 *     description: Author or team Admin only.
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comment deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       403:
 *         description: Not the author or an admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/comments/:commentId", requireAuth, deleteComment);

/**
 * @openapi
 * /api/bugs/{id}/attachments:
 *   post:
 *     summary: Upload an attachment (image or video) to a bug
 *     tags: [Bugs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Attachment added
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bug'
 *       400:
 *         description: Unsupported file type or too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/:id/attachments",
  requireAuth,
  upload.single("file"),
  addBugAttachment
);

/**
 * @openapi
 * /api/bugs/{id}/attachments/{attachmentId}:
 *   delete:
 *     summary: Delete an attachment from a bug
 *     description: Uploader or team Admin only.
 *     tags: [Bugs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attachment deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       403:
 *         description: Not the uploader or an admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id/attachments/:attachmentId", requireAuth, deleteBugAttachment);

export default router;