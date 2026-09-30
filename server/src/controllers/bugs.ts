import { Request, Response } from "express";
import { Bug, Membership } from "../models";
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
// Validates: (1) the user is a member of this bug's team, (2) the
// transition is legal, (3) role-specific rules for sensitive transitions.
export const updateBugStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status: newStatus } = req.body;
  const userId = (req as any).user._id;

  const bug = await Bug.findById(req.params.id);
  if (!bug) {
    return res.status(404).json({ message: "Bug not found" });
  }

  // Confirm the user belongs to this bug's team, and get their role.
  // We look this up here (rather than via requireTeamMember middleware)
  // because the bug status route only has the bug id in its URL,
  // not the team id — we need to fetch the bug first to know its team.
  const membership = await Membership.findOne({ team: bug.team, user: userId });
  if (!membership) {
    return res.status(403).json({ message: "You are not a member of this bug's team" });
  }

  // First check: is this a legal transition at all, regardless of role?
  if (!canTransition(bug.status, newStatus)) {
    return res.status(400).json({
      message: `Cannot move a bug from "${bug.status}" to "${newStatus}"`,
    });
  }

  // Second check: role-specific rules for sensitive transitions (FR021)
  const role = membership.role;

  // Only QA or admin can mark a bug as verified
  if (newStatus === "verified" && !["qa", "admin"].includes(role)) {
    return res.status(403).json({
      message: "Only QA or admin can verify a bug",
    });
  }

  // Only admin can reopen a closed bug
  if (bug.status === "closed" && newStatus === "reopened" && role !== "admin") {
    return res.status(403).json({
      message: "Only an admin can reopen a closed bug",
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