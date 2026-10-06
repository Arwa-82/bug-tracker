import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User } from "../models";
import { asyncHandler } from "../middleware/errorHandler";
import { sendPasswordResetEmail } from "../services/emailService";

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

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ message: "Email already in use" });
  }

  const user = await User.create({ name, email, password });
  const token = signToken(user._id.toString());

  res.status(201).json({ user: toSafeUser(user), token });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
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
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({ user: toSafeUser(user) });
});

// POST /auth/forgot-password — generates a reset token and "emails" it
// (via Ethereal's fake inbox). Always returns the same success message
// regardless of whether the email exists, so an attacker can't use this
// endpoint to discover which emails are registered.
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  // Same response whether or not the user exists — prevents email enumeration
  const genericResponse = {
    message: "If that email is registered, a reset link has been sent.",
  };

  if (!user) {
    return res.json(genericResponse);
  }

  // Generate a random token. We store a HASHED version in the DB (same
  // principle as passwords) and only ever send the plain version by email —
  // so even if the database were compromised, stored tokens are useless
  // without the original value.
  const plainToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(plainToken)
    .digest("hex");

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const resetUrl = `${clientUrl}/reset-password?token=${plainToken}`;

  const previewUrl = await sendPasswordResetEmail(user.email, resetUrl);

  // Ethereal doesn't deliver real email — this is the only way to actually
  // see the message, so we log it clearly to the server console.
  console.log("\n📧 Password reset email (Ethereal preview):");
  console.log(previewUrl, "\n");

  res.json(genericResponse);
});

// POST /auth/reset-password — takes the plain token from the emailed link
// plus a new password, verifies the hashed token matches and hasn't
// expired, then updates the password.
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() }, // must not be expired
  });

  if (!user) {
    return res.status(400).json({
      message: "This reset link is invalid or has expired.",
    });
  }

  user.password = password; // the pre("save") hook hashes this automatically
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  res.json({ message: "Password updated. You can now log in." });
});