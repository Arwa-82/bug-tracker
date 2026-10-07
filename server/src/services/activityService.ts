import { Activity } from "../models";
import type { ActivityAction } from "../models/Activity";
import { Types } from "mongoose";

export async function logActivity(
  bugId: Types.ObjectId | string,
  actorId: Types.ObjectId | string,
  action: ActivityAction,
  meta: Record<string, unknown> = {}
) {
  try {
    await Activity.create({ bug: bugId, actor: actorId, action, meta });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}