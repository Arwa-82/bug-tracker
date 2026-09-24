import { Request, Response } from "express";

// Bring in all three models this controller needs:
// Team (to create/find teams), Membership (to link users to teams),
// User (to look up a user by email when adding a member)
import { Team, Membership, User } from "../models";

// GET /teams — returns only the teams the logged-in user belongs to
export async function getMyTeams(req: Request, res: Response) {
  const userId = (req as any).user._id;

  // Find all memberships for this user, then pull in the linked team data
  const memberships = await Membership.find({ user: userId }).populate("team");

  // Shape the response: team info + the user's role in that team
  const teams = memberships.map((m: any) => ({
    id: m.team._id,
    name: m.team.name,
    key: m.team.key,
    role: m.role,
  }));

  res.json({ teams });
}

// POST /teams — creates a new team and makes the creator its admin
export async function createTeam(req: Request, res: Response) {
  const userId = (req as any).user._id;
  const { name, key } = req.body;

  const existing = await Team.findOne({ key: key.toUpperCase() });
  if (existing) {
    return res.status(409).json({ message: "Team key already in use" });
  }

  const team = await Team.create({
    name,
    key: key.toUpperCase(),
    createdBy: userId,
  });

  // Automatically add the creator as an admin member of the new team
  await Membership.create({
    team: team._id,
    user: userId,
    role: "admin",
  });

  res.status(201).json({
    team: { id: team._id, name: team.name, key: team.key },
  });
}

// POST /teams/:teamId/members — adds an existing user to a team by email.
// TODO: right now ANY logged-in user can add members to ANY team —
// this needs a role check (only admins of this team should be able to do this)
// once we build role-based permission middleware in a later step.
export async function addMember(req: Request, res: Response) {
  const { teamId } = req.params;
  const { email, role } = req.body;

  // Look up the user being added by their email address
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "No user found with that email" });
  }

  // Prevent adding the same user to the same team twice
  // (also enforced at the DB level by the unique index on {team, user})
  const existing = await Membership.findOne({ team: teamId, user: user._id });
  if (existing) {
    return res
      .status(409)
      .json({ message: "User is already a member of this team" });
  }

  // Create the membership — defaults to "developer" if no role was given
  const membership = await Membership.create({
    team: teamId,
    user: user._id,
    role: role || "developer",
  });

  res.status(201).json({ membership });
}
