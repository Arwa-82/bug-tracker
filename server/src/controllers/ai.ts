import { Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { draftBugReport } from "../services/aiService";

// POST /api/bugs/draft
// Takes rough free-text (req.body.rawText, already validated by
// draftBugSchema) and returns a structured bug-report draft for the user
// to review/edit before creating the bug. Nothing is saved to the
// database here — this is suggestion-only.
export const draftBug = asyncHandler(async (req: Request, res: Response) => {
  const { rawText } = req.body as { rawText: string };

  try {
    const draft = await draftBugReport(rawText);
    res.json(draft);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI drafting failed";
    res.status(502).json({ message });
  }
});