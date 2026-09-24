import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models";

function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined in .env");
  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
}

function toSafeUser(user: any) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
  };
}

export async function register(req: Request, res: Response) {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ message: "Email already in use" });
  }

  const user = await User.create({ name, email, password });
  const token = signToken(user._id.toString());

  res.status(201).json({ user: toSafeUser(user), token });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = signToken(user._id.toString());
  res.json({ user: toSafeUser(user), token });
}

export async function me(req: Request, res: Response) {
  // req.user is attached by the auth middleware (next step)
  const user = (req as any).user;
  res.json({ user: toSafeUser(user) });
}