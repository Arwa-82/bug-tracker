import { Request, Response } from "express";
import { Comment } from "../models";

// GET /bugs/:id/comments — list all comments for one bug, oldest first
// (oldest first so a comment thread reads top-to-bottom like a conversation)
export async function getBugComments(req: Request, res: Response) {
  const { id } = req.params; // bug id

  const comments = await Comment.find({ bug: id })
    .populate("author", "name email") // pull in the commenter's name/email, not their password
    .sort({ createdAt: 1 });

  res.json({ comments });
}

// POST /bugs/:id/comments — add a new comment to a bug
export async function addBugComment(req: Request, res: Response) {
  const { id } = req.params; // bug id
  const userId = (req as any).user._id;
  const { text } = req.body;

  const comment = await Comment.create({
    bug: id,
    author: userId,
    text,
  });

  // Populate the author field before sending back, so the frontend
  // can immediately show the commenter's name without a second fetch
  await comment.populate("author", "name email");

  res.status(201).json({ comment });
}