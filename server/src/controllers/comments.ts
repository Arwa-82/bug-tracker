import { Request, Response } from "express";
import { Comment, Bug, Membership } from "../models";
import { asyncHandler } from "../middleware/errorHandler";

// GET /bugs/:id/comments — list all comments for one bug, oldest first
export const getBugComments = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const comments = await Comment.find({ bug: id })
    .populate("author", "name email")
    .sort({ createdAt: 1 });

  res.json({ comments });
});

// POST /bugs/:id/comments — add a new comment to a bug
export const addBugComment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).user._id;
  const { text } = req.body;

  const comment = await Comment.create({
    bug: id,
    author: userId,
    text,
  });

  await comment.populate("author", "name email");

  res.status(201).json({ comment });
});

// DELETE /comments/:commentId — deletes a comment.
// Only the comment's author or a team admin (of the bug's team) can delete it.
export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json({ message: "Comment not found" });
  }

  // Need the bug to find its team, to check if the user is an admin there
  const bug = await Bug.findById(comment.bug);
  if (!bug) {
    return res.status(404).json({ message: "Associated bug not found" });
  }

  const membership = await Membership.findOne({ team: bug.team, user: userId });
  if (!membership) {
    return res.status(403).json({ message: "You are not a member of this bug's team" });
  }

  const isAuthor = comment.author.toString() === userId.toString();
  const isAdmin = membership.role === "admin";

  if (!isAuthor && !isAdmin) {
    return res.status(403).json({
      message: "Only the comment's author or a team admin can delete it",
    });
  }

  await Comment.deleteOne({ _id: commentId });

  res.json({ message: "Comment deleted" });
});