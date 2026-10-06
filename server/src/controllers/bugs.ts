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

// PATCH /bugs/:id — edits a bug's content fields (title, steps,
// expected/actual result, environment, severity, priority, labels).
// Any team member can edit — not restricted to reporter/admin, since
// fixing a typo or adding missed details is something any teammate
// should be able to do.
export const updateBug = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;

  const bug = await Bug.findById(req.params.id);
  if (!bug) {
    return res.status(404).json({ message: "Bug not found" });
  }

  const membership = await Membership.findOne({ team: bug.team, user: userId });
  if (!membership) {
    return res.status(403).json({ message: "You are not a member of this bug's team" });
  }

  // Only apply fields that were actually sent — req.body only contains
  // whatever the frontend included, thanks to the schema's .optional() fields
  Object.assign(bug, req.body);
  await bug.save();

  res.json({ bug });
});

// PATCH /bugs/:id/status — the core workflow endpoint.
export const updateBugStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status: newStatus } = req.body;
  const userId = (req as any).user._id;

  const bug = await Bug.findById(req.params.id);
  if (!bug) {
    return res.status(404).json({ message: "Bug not found" });
  }

  const membership = await Membership.findOne({ team: bug.team, user: userId });
  if (!membership) {
    return res.status(403).json({ message: "You are not a member of this bug's team" });
  }

  if (!canTransition(bug.status, newStatus)) {
    return res.status(400).json({
      message: `Cannot move a bug from "${bug.status}" to "${newStatus}"`,
    });
  }

  const role = membership.role;

  if (newStatus === "verified" && !["qa", "admin"].includes(role)) {
    return res.status(403).json({
      message: "Only QA or admin can verify a bug",
    });
  }

  if (bug.status === "closed" && newStatus === "reopened" && role !== "admin") {
    return res.status(403).json({
      message: "Only an admin can reopen a closed bug",
    });
  }

  bug.status = newStatus;
  await bug.save();

  res.json({ bug });
});

// PATCH /bugs/:id/assign — sets or clears a bug's assignee.
export const assignBug = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { assignee } = req.body;
  const userId = (req as any).user._id;

  const bug = await Bug.findById(id);
  if (!bug) {
    return res.status(404).json({ message: "Bug not found" });
  }

  const requesterMembership = await Membership.findOne({
    team: bug.team,
    user: userId,
  });
  if (!requesterMembership) {
    return res.status(403).json({ message: "You are not a member of this bug's team" });
  }

  if (assignee) {
    const assigneeMembership = await Membership.findOne({
      team: bug.team,
      user: assignee,
    });
    if (!assigneeMembership) {
      return res.status(400).json({
        message: "Assignee must be a member of this bug's team",
      });
    }
  }

  bug.assignee = assignee || null;
  await bug.save();

  res.json({ bug });
});

// DELETE /bugs/:id — permanently deletes a bug.
export const deleteBug = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;

  const bug = await Bug.findById(req.params.id);
  if (!bug) {
    return res.status(404).json({ message: "Bug not found" });
  }

  const membership = await Membership.findOne({ team: bug.team, user: userId });
  if (!membership) {
    return res.status(403).json({ message: "You are not a member of this bug's team" });
  }

  const isReporter = bug.reporter.toString() === userId.toString();
  const isAdmin = membership.role === "admin";

  if (!isReporter && !isAdmin) {
    return res.status(403).json({
      message: "Only the bug's reporter or a team admin can delete it",
    });
  }

  await Bug.deleteOne({ _id: bug._id });

  res.json({ message: "Bug deleted" });
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

// DELETE /bugs/:id/attachments/:attachmentId — removes one attachment
export const deleteBugAttachment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { id, attachmentId } = req.params;

  const bug = await Bug.findById(id);
  if (!bug) {
    return res.status(404).json({ message: "Bug not found" });
  }

  const membership = await Membership.findOne({ team: bug.team, user: userId });
  if (!membership) {
    return res.status(403).json({ message: "You are not a member of this bug's team" });
  }

  const index = Number(attachmentId);
  const attachment = bug.attachments[index];

  if (!attachment) {
    return res.status(404).json({ message: "Attachment not found" });
  }

  const isUploader = attachment.uploadedBy.toString() === userId.toString();
  const isAdmin = membership.role === "admin";

  if (!isUploader && !isAdmin) {
    return res.status(403).json({
      message: "Only the uploader or a team admin can delete this attachment",
    });
  }

  bug.attachments.splice(index, 1);
  await bug.save();

  res.json({ bug });
});