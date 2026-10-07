import { Schema, model, Document, Types } from "mongoose";

export type BugStatus =
  | "open"
  | "in_progress"
  | "fixed"
  | "verified"
  | "closed"
  | "reopened";

export type BugSeverity = "low" | "medium" | "high" | "critical";
export type BugPriority = "low" | "medium" | "high";

export interface IAttachment {
  url: string;
  filename: string;
  mimetype: string;
  uploadedBy: Types.ObjectId;
}

export interface IEnvironment {
  device: string;
  browser: string;
}

export interface IBug extends Document {
  _id: Types.ObjectId;
  team: Types.ObjectId;
  title: string;
  description: string;
  stepsToReproduce: string[];
  expectedResult: string;
  actualResult: string;
  environment: IEnvironment;
  severity: BugSeverity;
  priority: BugPriority;
  status: BugStatus;
  reporter: Types.ObjectId;
  assignee: Types.ObjectId | null;
  labels: string[];
  attachments: IAttachment[];
  // Other bugs this one is related to — can be on a different team.
  // Stored as a plain array of ObjectIds (not populated automatically)
  // so the controller can control exactly what gets exposed, since a
  // linked bug might belong to a team the viewer isn't a member of.
  linkedBugs: Types.ObjectId[];
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

const environmentSchema = new Schema<IEnvironment>(
  {
    device: { type: String, default: "" },
    browser: { type: String, default: "" },
  },
  { _id: false }
);

const bugSchema = new Schema<IBug>(
  {
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    stepsToReproduce: { type: [String], default: [] },
    expectedResult: { type: String, default: "" },
    actualResult: { type: String, default: "" },
    environment: { type: environmentSchema, default: () => ({}) },
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
    linkedBugs: { type: [Schema.Types.ObjectId], ref: "Bug", default: [] },
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

bugSchema.index({ team: 1 });

export const Bug = model<IBug>("Bug", bugSchema);