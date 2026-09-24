import { Router } from "express";
import { getBug, updateBugStatus, addBugAttachment } from "../controllers/bugs";
import { getBugComments, addBugComment } from "../controllers/comments";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { updateStatusSchema } from "../schemas/bugSchemas";
import { createCommentSchema } from "../schemas/commentSchemas";
import { upload } from "../middleware/upload";

const router = Router();

// Mounted at /api/bugs in app.ts

// Bug detail
router.get("/:id", requireAuth, getBug);
router.patch(
  "/:id/status",
  requireAuth,
  validate(updateStatusSchema),
  updateBugStatus
);

// Comments on a bug
router.get("/:id/comments", requireAuth, getBugComments);
router.post(
  "/:id/comments",
  requireAuth,
  validate(createCommentSchema),
  addBugComment
);

// File attachments on a bug — "file" must match the field name the frontend sends
router.post(
  "/:id/attachments",
  requireAuth,
  upload.single("file"),
  addBugAttachment
);

export default router;