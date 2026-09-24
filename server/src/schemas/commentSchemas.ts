import { z } from "zod";

// Used when adding a new comment to a bug (POST /bugs/:id/comments)
export const createCommentSchema = z.object({
  text: z.string().min(1, "Comment text is required"),
});