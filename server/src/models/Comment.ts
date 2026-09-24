import { Schema, model, Document, Types } from "mongoose";

// A single comment on a bug — simple text + who wrote it + when
export interface IComment extends Document {
  _id: Types.ObjectId;
  bug: Types.ObjectId; // which bug this comment belongs to
  author: Types.ObjectId; // which user wrote it
  text: string;
}

const commentSchema = new Schema<IComment>(
  {
    bug: { type: Schema.Types.ObjectId, ref: "Bug", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true } // createdAt is what we'll sort comments by
);

// Speeds up "get all comments for this bug" — the main query we'll run
commentSchema.index({ bug: 1 });

export const Comment = model<IComment>("Comment", commentSchema);