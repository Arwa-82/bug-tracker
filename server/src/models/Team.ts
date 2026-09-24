import { Schema, model, Document, Types } from "mongoose";

// Represents one team's workspace — everything else (bugs, comments)
// will reference a team so data stays scoped per team.
export interface ITeam extends Document {
  _id: Types.ObjectId;
  name: string;
  key: string; // short code like "MOB", "PAY" — used later in bug IDs
  createdBy: Types.ObjectId; // which user created the team
}

const teamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, unique: true, uppercase: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true } // adds createdAt / updatedAt automatically
);

export const Team = model<ITeam>("Team", teamSchema);