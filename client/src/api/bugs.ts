import { apiFetch } from "./client";

export type BugStatus =
  | "open"
  | "in_progress"
  | "fixed"
  | "verified"
  | "closed"
  | "reopened";

export type BugSeverity = "low" | "medium" | "high" | "critical";
export type BugPriority = "low" | "medium" | "high";

export interface Attachment {
  url: string;
  filename: string;
  mimetype: string;
  uploadedBy: string;
}

export interface Environment {
  device: string;
  browser: string;
}

export interface Bug {
  id: string;
  title: string;
  description: string;
  stepsToReproduce: string[];
  expectedResult: string;
  actualResult: string;
  environment: Environment;
  severity: BugSeverity;
  priority: BugPriority;
  status: BugStatus;
  team: string;
  reporter: string;
  assignee: string | null;
  labels: string[];
  attachments: Attachment[];
  linkedBugs: string[];
}

// Fetches all bugs for one team's board
export function getTeamBugs(teamId: string) {
  return apiFetch<{ bugs: Bug[] }>(`/teams/${teamId}/bugs`);
}

// Creates a new bug on a team's board
export function createBug(
  teamId: string,
  data: {
    title: string;
    severity?: BugSeverity;
    priority?: BugPriority;
    stepsToReproduce?: string[];
    expectedResult?: string;
    actualResult?: string;
    environment?: Environment;
    labels?: string[];
  }
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

// Edits a bug's content fields. Pass only the fields you want to change —
// the backend only updates what's included in the request body.
export function updateBug(
  bugId: string,
  data: Partial<{
    title: string;
    description: string;
    stepsToReproduce: string[];
    expectedResult: string;
    actualResult: string;
    environment: Environment;
    severity: BugSeverity;
    priority: BugPriority;
    labels: string[];
  }>
) {
  return apiFetch<{ bug: Bug }>(`/bugs/${bugId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// Moves a bug to a new status
export function updateBugStatus(bugId: string, status: BugStatus) {
  return apiFetch<{ bug: Bug }>(`/bugs/${bugId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// Sets or clears a bug's assignee. Pass null to unassign.
export function assignBug(bugId: string, assignee: string | null) {
  return apiFetch<{ bug: Bug }>(`/bugs/${bugId}/assign`, {
    method: "PATCH",
    body: JSON.stringify({ assignee }),
  });
}

// Permanently deletes a bug
export function deleteBug(bugId: string) {
  return apiFetch<{ message: string }>(`/bugs/${bugId}`, {
    method: "DELETE",
  });
}

// Deletes one attachment from a bug, identified by its array index
export function deleteBugAttachment(bugId: string, attachmentIndex: number) {
  return apiFetch<{ bug: Bug }>(
    `/bugs/${bugId}/attachments/${attachmentIndex}`,
    { method: "DELETE" }
  );
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
// Shape of a bug when it's shown as a search result or linked-bug summary —
// includes the team name/key so cross-team context is visible, unlike
// the plain Bug type which only has a team id.
export interface BugWithTeam extends Omit<Bug, "team"> {
  team: { id: string; name: string; key: string };
}

// Searches bug titles across every team the current user belongs to.
// Used for the "link to another bug" picker.
export function searchBugs(query: string) {
  return apiFetch<{ bugs: BugWithTeam[] }>(
    `/bugs/search?q=${encodeURIComponent(query)}`
  );
}

// Fetches the bugs linked to this one. Bugs on teams the user can't
// access are already filtered out by the backend.
export function getLinkedBugs(bugId: string) {
  return apiFetch<{ linkedBugs: BugWithTeam[] }>(`/bugs/${bugId}/links`);
}

// Links this bug to another one. Requires the user to be a member of
// both bugs' teams — the backend enforces that; this call throws if not.
export function linkBug(bugId: string, linkedBugId: string) {
  return apiFetch<{ bug: Bug }>(`/bugs/${bugId}/links`, {
    method: "POST",
    body: JSON.stringify({ linkedBugId }),
  });
}

// Removes a link between two bugs
export function unlinkBug(bugId: string, linkedBugId: string) {
  return apiFetch<{ bug: Bug }>(`/bugs/${bugId}/links/${linkedBugId}`, {
    method: "DELETE",
  });
}