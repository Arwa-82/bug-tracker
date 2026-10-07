import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { Membership } from "../models";

const toObjectId = (value: string | string[] | undefined, fieldName: string) => {
  const raw = Array.isArray(value) ? value[0] : value;

  if (!raw) {
    throw new Error(`Missing ${fieldName}`);
  }

  return new Types.ObjectId(raw);
};

// Checks that the logged-in user is a member of the team in the URL params.
// Attaches the membership (with its role) to req so controllers — or the
// requireRole middleware below — can check role-based permissions.
export async function requireTeamMember(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = (req as any).user._id;
  const teamId = toObjectId(req.params.teamId, "team id");

  const membership = await Membership.findOne({ team: teamId, user: userId });

  if (!membership) {
    return res.status(403).json({ message: "You are not a member of this team" });
  }

  (req as any).membership = membership;
  next();
}

// Restricts a route to only members with one of the given roles.
// Must run AFTER requireTeamMember, since it relies on req.membership
// having already been set. Usage: requireRole("admin") or requireRole("admin", "qa")
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const membership = (req as any).membership;

    if (!membership) {
      // This means requireRole was used without requireTeamMember running first —
      // a coding mistake, not a normal user-facing error, but fail safely anyway.
      return res.status(500).json({ message: "Membership not resolved" });
    }

    if (!allowedRoles.includes(membership.role)) {
      return res.status(403).json({
        message: `This action requires one of these roles: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
}