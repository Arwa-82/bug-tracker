import { apiFetch } from "./client";

export interface Comment {
  id: string;
  text: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

// Fetches all comments for a bug, oldest first
export function getBugComments(bugId: string) {
  return apiFetch<{ comments: Comment[] }>(`/bugs/${bugId}/comments`);
}

// Adds a new comment to a bug
export function addBugComment(bugId: string, text: string) {
  return apiFetch<{ comment: Comment }>(`/bugs/${bugId}/comments`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}