import { apiFetch } from "./client";

export type ActivityAction =
  | "status_changed"
  | "assigned"
  | "unassigned"
  | "comment_added"
  | "attachment_added"
  | "attachment_removed"
  | "bug_updated";

export interface Activity {
  id: string;
  bug: string;
  actor: {
    _id: string; // note: actor isn't run through the id-normalizing toJSON transform, so it's _id here, not id
    name: string;
    email: string;
  };
  action: ActivityAction;
  meta: Record<string, unknown>;
  createdAt: string;
}

export function getBugActivity(bugId: string) {
  return apiFetch<{ activity: Activity[] }>(`/bugs/${bugId}/activity`);
}