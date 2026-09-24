import { Schema, model, Document, Types } from "mongoose";

// The set of statuses a bug can be in. Kept as a TS union type so
// the compiler catches typos anywhere we reference a status string.
export type BugStatus =
  | "open"
  | "in_progress"
  | "fixed"
  | "verified"
  | "closed"
  | "reopened";

export type BugSeverity = "low" | "medium" | "high" | "critical";
export type BugPriority = "low" | "medium" | "high";

// One uploaded file attached to a bug — an image or a video
export interface IAttachment {
  url: string;
  filename: string;
  mimetype: string;
  uploadedBy: Types.ObjectId;
}

export interface IBug extends Document {
  _id: Types.ObjectId;
  team: Types.ObjectId;
  title: string;
  description: string;
  stepsToReproduce: string[];
  expectedResult: string;
  actualResult: string;
  severity: BugSeverity;
  priority: BugPriority;
  status: BugStatus;
  reporter: Types.ObjectId;
  assignee: Types.ObjectId | null;
  labels: string[];
  attachments: IAttachment[];
}

const attachmentSchema = new Schema<IAttachment>(
  {
    url: { type: String, required: true },
    filename: { type: String, required: true },
    mimetype: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false, timestamps: true }
);

const bugSchema = new Schema<IBug>(
  {
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    stepsToReproduce: { type: [String], default: [] },
    expectedResult: { type: String, default: "" },
    actualResult: { type: String, default: "" },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "fixed", "verified", "closed", "reopened"],
      default: "open",
    },
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignee: { type: Schema.Types.ObjectId, ref: "User", default: null },
    labels: { type: [String], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
  },
  {
    timestamps: true,
    // This transform runs automatically whenever a Bug document is
    // converted to JSON (e.g. res.json({ bug })). It copies _id into
    // a plain "id" string field and removes _id/__v, so the frontend
    // can consistently use bug.id everywhere instead of bug._id.
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

// Speeds up the board's main query: "give me all bugs for team X"
bugSchema.index({ team: 1 });

export const Bug = model<IBug>("Bug", bugSchema);