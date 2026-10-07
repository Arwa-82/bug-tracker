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

const router = Router();

// IMPORTANT: /search must be declared BEFORE /:id, otherwise Express
// would match "search" as if it were a bug id and route it to getBug instead.
router.get("/search", requireAuth, searchBugs);

router.get("/:id", requireAuth, getBug);
router.patch("/:id", requireAuth, validate(updateBugSchema), updateBug);
router.patch(
  "/:id/status",
  requireAuth,
  validate(updateStatusSchema),
  updateBugStatus
);
router.patch("/:id/assign", requireAuth, validate(assignBugSchema), assignBug);
router.delete("/:id", requireAuth, deleteBug);
router.get("/:id/activity", requireAuth, getBugActivity);

// Linked issues
router.get("/:id/links", requireAuth, getLinkedBugs);
router.post("/:id/links", requireAuth, validate(linkBugSchema), linkBug);
router.delete("/:id/links/:linkedBugId", requireAuth, unlinkBug);

router.get("/:id/comments", requireAuth, getBugComments);
router.post(
  "/:id/comments",
  requireAuth,
  validate(createCommentSchema),
  addBugComment
);
router.delete("/comments/:commentId", requireAuth, deleteComment);

router.post(
  "/:id/attachments",
  requireAuth,
  upload.single("file"),
  addBugAttachment
);
router.delete("/:id/attachments/:attachmentId", requireAuth, deleteBugAttachment);

export default router;