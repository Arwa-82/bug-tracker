import { Request, Response } from "express";
import { Bug, Membership, Activity } from "../models";
import { canTransition } from "../services/statusWorkflow";
import { logActivity } from "../services/activityService";
import { asyncHandler } from "../middleware/errorHandler";

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

export const getBug = asyncHandler(async (req: Request, res: Response) => {
  const bug = await Bug.findById(req.params.id);
  if (!bug) {
    return res.status(404).json({ message: "Bug not found" });
  }
  res.json({ bug });
});

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

  const changedFields = Object.keys(req.body).filter(
    (key) => JSON.stringify((bug as any)[key]) !== JSON.stringify(req.body[key])
  );

  Object.assign(bug, req.body);
  await bug.save();

  if (changedFields.length > 0) {
    await logActivity(bug._id, userId, "bug_updated", { fields: changedFields });
  }

  res.json({ bug });
});

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

  const previousStatus = bug.status;
  bug.status = newStatus;
  await bug.save();

  await logActivity(bug._id, userId, "status_changed", {
    from: previousStatus,
    to: newStatus,
  });

  res.json({ bug });
});

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

  await logActivity(
    bug._id,
    userId,
    assignee ? "assigned" : "unassigned",
    { assignee: assignee || null }
  );

  res.json({ bug });
});

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

  await logActivity(bug._id, userId, "attachment_added", {
    filename: file.originalname,
  });

  res.status(201).json({ bug });
});

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

  const removedFilename = attachment.filename;
  bug.attachments.splice(index, 1);
  await bug.save();

  await logActivity(bug._id, userId, "attachment_removed", {
    filename: removedFilename,
  });

  res.json({ bug });
});

// GET /bugs/:id/activity — fetch the timeline of events for a bug,
// oldest first so it reads top-to-bottom like a history log
export const getBugActivity = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const activity = await Activity.find({ bug: id })
    .populate("actor", "name email")
    .sort({ createdAt: 1 });

  res.json({ activity });
});