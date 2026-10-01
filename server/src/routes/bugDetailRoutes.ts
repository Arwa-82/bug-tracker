import { Router } from "express";
import {
  getBug,
  updateBugStatus,
  assignBug,
  deleteBug,
  addBugAttachment,
  deleteBugAttachment,
} from "../controllers/bugs";
import {
  getBugComments,
  addBugComment,
  deleteComment,
} from "../controllers/comments";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { updateStatusSchema, assignBugSchema } from "../schemas/bugSchemas";
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
router.patch(
  "/:id/assign",
  requireAuth,
  validate(assignBugSchema),
  assignBug
);
router.delete("/:id", requireAuth, deleteBug);

// Comments on a bug
router.get("/:id/comments", requireAuth, getBugComments);
router.post(
  "/:id/comments",
  requireAuth,
  validate(createCommentSchema),
  addBugComment
);
router.delete("/comments/:commentId", requireAuth, deleteComment);

// File attachments on a bug
router.post(
  "/:id/attachments",
  requireAuth,
  upload.single("file"),
  addBugAttachment
);
router.delete("/:id/attachments/:attachmentId", requireAuth, deleteBugAttachment);

export default router;