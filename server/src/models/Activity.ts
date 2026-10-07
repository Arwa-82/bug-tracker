import { Schema, model, Document, Types } from "mongoose";

export type ActivityAction =
  | "status_changed"
  | "assigned"
  | "unassigned"
  | "comment_added"
  | "attachment_added"
  | "attachment_removed"
  | "bug_updated";

export interface IActivity extends Document {
  _id: Types.ObjectId;
  bug: Types.ObjectId;
  actor: Types.ObjectId;
  action: ActivityAction;
  meta: Record<string, unknown>;
}

const activitySchema = new Schema<IActivity>(
  {
    bug: { type: Schema.Types.ObjectId, ref: "Bug", required: true },
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      enum: [
        "status_changed",
        "assigned",
        "unassigned",
        "comment_added",
        "attachment_added",
        "attachment_removed",
        "bug_updated",
      ],
      required: true,
    },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
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

activitySchema.index({ bug: 1, createdAt: 1 });

export const Activity = model<IActivity>("Activity", activitySchema);