import { Request, Response } from "express";
import { Bug } from "../models";
import { canTransition } from "../services/statusWorkflow";
import { asyncHandler } from "../middleware/errorHandler";

// GET /teams/:teamId/bugs — list bugs for one team, with optional filters
export const getTeamBugs = asyncHandler(async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const { status, severity, assignee } = req.query;

  const query: Record<string, unknown> = { team: teamId };
  if (status) query.status = status;
  if (severity) query.severity = severity;
  if (assignee) query.assignee = assignee;

  const bugs = await Bug.find(query).sort({ createdAt: -1 });
  res.json({ bugs });
});

// POST /teams/:teamId/bugs — create a new bug on this team's board
export const createBug = asyncHandler(async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const userId = (req as any).user._id;

  const bug = await Bug.create({
    ...req.body,
    team: teamId,
    reporter: userId,
  });

  res.status(201).json({ bug });
});

// GET /bugs/:id — fetch a single bug's full detail
export const getBug = asyncHandler(async (req: Request, res: Response) => {
  const bug = await Bug.findById(req.params.id);
  if (!bug) {
    return res.status(404).json({ message: "Bug not found" });
  }
  res.json({ bug });
});

// PATCH /bugs/:id/status — the core workflow endpoint.
export const updateBugStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status: newStatus } = req.body;

  const bug = await Bug.findById(req.params.id);
  if (!bug) {
    return res.status(404).json({ message: "Bug not found" });
  }

  if (!canTransition(bug.status, newStatus)) {
    return res.status(400).json({
      message: `Cannot move a bug from "${bug.status}" to "${newStatus}"`,
    });
  }

  bug.status = newStatus;
  await bug.save();

  res.json({ bug });
});

// POST /bugs/:id/attachments — upload an image or video to a bug.
export const addBugAttachment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ message: "No file was uploaded" });
  }

  const bug = await Bug.findById(req.params.id);
  if (!bug) {
    return res.status(404).json({ message: "Bug not found" });
  }

  bug.attachments.push({
    url: `/uploads/${file.filename}`,
    filename: file.originalname,
    mimetype: file.mimetype,
    uploadedBy: userId,
  });

  await bug.save();

  res.status(201).json({ bug });
});