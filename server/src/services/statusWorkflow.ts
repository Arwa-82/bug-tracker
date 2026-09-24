import { BugStatus } from "../models/Bug";

// Defines which status changes are legal. If a "from" status isn't
// in this map, or the "to" status isn't in its array, the move is rejected.
const allowedTransitions: Record<BugStatus, BugStatus[]> = {
  open: ["in_progress"],
  in_progress: ["fixed", "open"],
  fixed: ["verified", "reopened"],
  verified: ["closed", "reopened"],
  closed: ["reopened"],
  reopened: ["in_progress"],
};

// Checks if moving from one status to another is a legal transition.
// Used by the PATCH /bugs/:id/status endpoint before saving anything.
export function canTransition(from: BugStatus, to: BugStatus): boolean {
  return allowedTransitions[from]?.includes(to) ?? false;
}