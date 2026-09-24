import { Request, Response, NextFunction } from "express";
import { Membership } from "../models";

// Checks that the logged-in user is a member of the team in the URL params.
// Attaches the membership (with its role) to req so controllers can check
// role-based permissions later (e.g. "only qa/admin can verify a bug").
export async function requireTeamMember(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = (req as any).user._id;
  const teamId = req.params.teamId;

  const membership = await Membership.findOne({ team: teamId, user: userId });

  if (!membership) {
    return res.status(403).json({ message: "You are not a member of this team" });
  }

  (req as any).membership = membership;
  next();
}