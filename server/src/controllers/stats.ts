import { Request, Response } from "express";
import { Bug } from "../models";
import { asyncHandler } from "../middleware/errorHandler";
import { Types } from "mongoose";

// GET /teams/:teamId/stats — aggregate counts for a team's dashboard.
// Runs two aggregation pipelines: one grouping bugs by status,
// one grouping by severity. Mongoose aggregation is much faster
// than fetching all bugs and counting them in JavaScript.
export const getTeamStats = asyncHandler(async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const teamObjectId = new Types.ObjectId(teamId);

  // Count bugs grouped by status, e.g. { open: 4, in_progress: 2, ... }
  const statusAgg = await Bug.aggregate([
    { $match: { team: teamObjectId } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  // Count bugs grouped by severity, e.g. { critical: 1, high: 3, ... }
  const severityAgg = await Bug.aggregate([
    { $match: { team: teamObjectId } },
    { $group: { _id: "$severity", count: { $sum: 1 } } },
  ]);

  // Aggregation results come back as an array of { _id, count } —
  // reshape both into simple objects keyed by status/severity name,
  // which is much easier for the frontend to consume.
  const byStatus: Record<string, number> = {};
  for (const row of statusAgg) {
    byStatus[row._id] = row.count;
  }

  const bySeverity: Record<string, number> = {};
  for (const row of severityAgg) {
    bySeverity[row._id] = row.count;
  }

  // Total bug count across the whole team — sum of all statuses
  const total = statusAgg.reduce((sum, row) => sum + row.count, 0);

  // "Open" here means anything not yet closed — useful as a single
  // headline number on the dashboard (open vs total)
  const openCount = total - (byStatus.closed || 0);

  res.json({
    total,
    open: openCount,
    byStatus,
    bySeverity,
  });
});
// GET /teams/:teamId/sprint-report?startDate=...&endDate=...
// Returns stats scoped to a date range instead of all-time — useful for
// an end-of-sprint summary. "Created" counts bugs reported in the window;
// "resolved" counts bugs that reached fixed/verified/closed in the window
// (approximated by updatedAt, since we don't track a separate resolvedAt
// field — good enough for a summary report, not exact to the second).
export const getSprintReport = asyncHandler(async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      message: "startDate and endDate query params are required",
    });
  }

  const start = new Date(startDate as string);
  const end = new Date(endDate as string);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ message: "Invalid date format" });
  }

  const teamObjectId = new Types.ObjectId(teamId);

  // Bugs created within the window
  const created = await Bug.find({
    team: teamObjectId,
    createdAt: { $gte: start, $lte: end },
  });

  // Bugs that reached a "resolved" state (fixed, verified, or closed)
  // and were last updated within the window — approximates "resolved
  // during this sprint" without needing a dedicated resolvedAt field
  const resolved = await Bug.find({
    team: teamObjectId,
    status: { $in: ["fixed", "verified", "closed"] },
    updatedAt: { $gte: start, $lte: end },
  });

  // Breakdown of the resolved set by severity — useful to see whether
  // the team focused on critical issues or mostly cleared minor ones
  const resolvedBySeverity: Record<string, number> = {};
  for (const bug of resolved) {
    resolvedBySeverity[bug.severity] = (resolvedBySeverity[bug.severity] || 0) + 1;
  }

  // Breakdown of created bugs by severity — shows what kind of issues
  // came in during the sprint
  const createdBySeverity: Record<string, number> = {};
  for (const bug of created) {
    createdBySeverity[bug.severity] = (createdBySeverity[bug.severity] || 0) + 1;
  }

  // Still-open bugs that were created before or during this window —
  // the backlog carried into (or still sitting at the end of) the sprint
  const stillOpen = await Bug.countDocuments({
    team: teamObjectId,
    status: { $nin: ["closed", "verified"] },
    createdAt: { $lte: end },
  });

  res.json({
    startDate: start,
    endDate: end,
    createdCount: created.length,
    resolvedCount: resolved.length,
    createdBySeverity,
    resolvedBySeverity,
    stillOpen,
  });
});