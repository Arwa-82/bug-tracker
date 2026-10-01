import { apiFetch } from "./client";

// Matches the backend's Bug model shape (server/src/models/Bug.ts).
export type BugStatus =
  | "open"
  | "in_progress"
  | "fixed"
  | "verified"
  | "closed"
  | "reopened";

export type BugSeverity = "low" | "medium" | "high" | "critical";
export type BugPriority = "low" | "medium" | "high";

// One uploaded file attached to a bug
export interface Attachment {
  url: string;
  filename: string;
  mimetype: string;
  uploadedBy: string;
}

export interface Bug {
  id: string;
  title: string;
  description: string;
  stepsToReproduce: string[];
  expectedResult: string;
  actualResult: string;
  severity: BugSeverity;
  priority: BugPriority;
  status: BugStatus;
  team: string;
  reporter: string;
  assignee: string | null;
  attachments: Attachment[];
}

// Fetches all bugs for one team's board
export function getTeamBugs(teamId: string) {
  return apiFetch<{ bugs: Bug[] }>(`/teams/${teamId}/bugs`);
}

// Creates a new bug on a team's board
export function createBug(
  teamId: string,
  data: { title: string; severity?: BugSeverity; priority?: BugPriority }
) {
  return apiFetch<{ bug: Bug }>(`/teams/${teamId}/bugs`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Fetches a single bug's full detail
export function getBug(bugId: string) {
  return apiFetch<{ bug: Bug }>(`/bugs/${bugId}`);
}

// Moves a bug to a new status
export function updateBugStatus(bugId: string, status: BugStatus) {
  return apiFetch<{ bug: Bug }>(`/bugs/${bugId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// Permanently deletes a bug. Only the reporter or a team admin can do this —
// the backend enforces that; this call will throw if the user isn't allowed.
export function deleteBug(bugId: string) {
  return apiFetch<{ message: string }>(`/bugs/${bugId}`, {
    method: "DELETE",
  });
}

// Uploads a file (image or video) to a bug.
// Note: this does NOT use apiFetch, because file uploads need
// FormData instead of JSON, and the browser sets its own
// Content-Type header (with the correct multipart boundary) —
// setting Content-Type manually would actually break the upload.
export async function uploadBugAttachment(bugId: string, file: File) {
  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL;

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/bugs/${bugId}/attachments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Upload failed");
  }

  return data as { bug: Bug };
}
// Deletes one attachment from a bug, identified by its array index
// (attachments don't have their own database id — see backend note).
export function deleteBugAttachment(bugId: string, attachmentIndex: number) {
  return apiFetch<{ bug: Bug }>(
    `/bugs/${bugId}/attachments/${attachmentIndex}`,
    { method: "DELETE" }
  );
}
// Sets or clears a bug's assignee. Pass null to unassign.
export function assignBug(bugId: string, assignee: string | null) {
  return apiFetch<{ bug: Bug }>(`/bugs/${bugId}/assign`, {
    method: "PATCH",
    body: JSON.stringify({ assignee }),
  });
}