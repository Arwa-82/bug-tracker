import { apiFetch } from "./client";
import type { BugSeverity, BugPriority } from "./bugs";

// Shape returned by POST /api/bugs/draft — a suggested bug report built
// from rough free-text by the local AI model. Nothing is saved server-side;
// the caller decides whether to use it to prefill the create-bug form.
export interface AiDraftResult {
  title: string;
  stepsToReproduce: string[];
  expectedResult: string;
  actualResult: string;
  severity: BugSeverity;
  priority: BugPriority;
  labels: string[];
  environment: {
    device: string;
    browser: string;
  };
}

export async function draftBugFromText(rawText: string): Promise<AiDraftResult> {
  return apiFetch("/bugs/draft", {
    method: "POST",
    body: JSON.stringify({ rawText }),
  });
}