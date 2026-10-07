import { Request, Response } from "express";
import { Team, Membership, User } from "../models";
import { asyncHandler } from "../middleware/errorHandler";

// GET /teams — returns only the teams the logged-in user belongs to
export const getMyTeams = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user._id;

  const memberships = await Membership.find({ user: userId }).populate("team");

  const teams = memberships.map((m: any) => ({
    id: m.team._id,
    name: m.team.name,
    key: m.team.key,
    role: m.role,
  }));

  res.json({ teams });
});

// POST /teams — creates a new team and makes the creator its admin
export const createTeam = asyncHandler(async (req: Request, res: Response) => {
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

  await Membership.create({
    team: team._id,
    user: userId,
    role: "admin",
  });

  res.status(201).json({
    team: { id: team._id, name: team.name, key: team.key },
  });
});

// GET /teams/:teamId/members — list everyone on a team, with their role
export const getTeamMembers = asyncHandler(async (req: Request, res: Response) => {
  const { teamId } = req.params;

  const memberships = await Membership.find({ team: teamId }).populate(
    "user",
    "name email"
  );

  const members = memberships.map((m: any) => ({
    membershipId: m._id,
    userId: m.user._id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
  }));

  res.json({ members });
});

// POST /teams/:teamId/members — adds an existing user to a team by email.
// Restricted to admins via requireRole("admin") in the route definition.
export const addMember = asyncHandler(async (req: Request, res: Response) => {
  const { teamId } = req.params;
  const { email, role } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "No user found with that email" });
  }

  const existing = await Membership.findOne({ team: teamId, user: user._id });
  if (existing) {
    return res
      .status(409)
      .json({ message: "User is already a member of this team" });
  }

  const membership = await Membership.create({
    team: teamId,
    user: user._id,
    role: role || "developer",
  });

  res.status(201).json({ membership });
});

// PATCH /teams/:teamId/members/:userId — change a member's role.
// Restricted to admins via requireRole("admin") in the route definition.
export const updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
  const { teamId, userId } = req.params;
  const { role } = req.body;

  const membership = await Membership.findOne({ team: teamId, user: userId });
  if (!membership) {
    return res.status(404).json({ message: "Membership not found" });
  }

  // Prevent an admin from demoting themselves if they're the team's
  // last remaining admin — otherwise the team could end up with no
  // admin at all, and no one left who can manage it.
  if (membership.role === "admin" && role !== "admin") {
    const adminCount = await Membership.countDocuments({
      team: teamId,
      role: "admin",
    });
    if (adminCount <= 1) {
      return res.status(400).json({
        message: "Cannot change role: this is the team's last remaining admin",
      });
    }
  }

  membership.role = role;
  await membership.save();

  res.json({ membership });
});

// DELETE /teams/:teamId/members/:userId — remove a member from a team.
// Restricted to admins via requireRole("admin") in the route definition.
export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const { teamId, userId } = req.params;

  const membership = await Membership.findOne({ team: teamId, user: userId });
  if (!membership) {
    return res.status(404).json({ message: "Membership not found" });
  }

  // Same protection as above — don't allow removing the last admin
  if (membership.role === "admin") {
    const adminCount = await Membership.countDocuments({
      team: teamId,
      role: "admin",
    });
    if (adminCount <= 1) {
      return res.status(400).json({
        message: "Cannot remove the team's last remaining admin",
      });
    }
  }

  await Membership.deleteOne({ _id: membership._id });

  res.json({ message: "Member removed" });
});