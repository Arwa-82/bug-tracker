import { Schema, model, Document, Types } from "mongoose";

export type MembershipRole = "admin" | "developer" | "qa";

export interface IMembership extends Document {
  _id: Types.ObjectId;
  team: Types.ObjectId;
  user: Types.ObjectId;
  role: MembershipRole;
}

const membershipSchema = new Schema<IMembership>(
  {
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["admin", "developer", "qa"],
      required: true,
    },
  },
  { timestamps: true }
);

// Prevents the same user from having two memberships in the same team
membershipSchema.index({ team: 1, user: 1 }, { unique: true });

export const Membership = model<IMembership>("Membership", membershipSchema);