import { Schema, model, Document, Types } from "mongoose";

export interface IComment extends Document {
  _id: Types.ObjectId;
  bug: Types.ObjectId;
  author: Types.ObjectId;
  text: string;
}

const commentSchema = new Schema<IComment>(
  {
    bug: { type: Schema.Types.ObjectId, ref: "Bug", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
    // Same transform pattern as the Bug model — converts _id into a
    // plain "id" string and removes _id/__v, so the frontend can
    // consistently use comment.id instead of comment._id.
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

commentSchema.index({ bug: 1 });

export const Comment = model<IComment>("Comment", commentSchema);