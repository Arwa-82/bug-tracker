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

// Uploads a file (image or video) to a bug.
// Note: this does NOT use apiFetch, because file uploads need
// FormData instead of JSON, and the browser sets its own
// Content-Type header (with the correct multipart boundary) —
// setting Content-Type manually would actually break the upload.
export async function uploadBugAttachment(bugId: string, file: File) {
  const token = localStorage.getItem("token");
  const API_URL = import.meta.env.VITE_API_URL;

  const formData = new FormData();
  formData.append("file", file); // "file" must match multer's upload.single("file") on the backend

  const res = await fetch(`${API_URL}/bugs/${bugId}/attachments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // No Content-Type here on purpose — see note above
    },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "Upload failed");
  }

  return data as { bug: Bug };
}