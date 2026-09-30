
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { User } from "../models";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = header.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error("JWT_SECRET is not defined in .env");

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const payload = decoded as JwtPayload & { userId?: string };

    if (typeof decoded === "string" || !payload.userId) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }
    (req as any).user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
