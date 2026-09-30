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