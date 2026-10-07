import { Router } from "express";
import {
  register,
  login,
  me,
  forgotPassword,
  resetPassword,
} from "../controllers/auth";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../schemas/authSchemas";
import rateLimit from "express-rate-limit";

// Rate limit password reset requests specifically — this sends an email,
// so it needs protection against someone spamming an inbox or probing
// for valid accounts.
const forgotPasswordLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many requests, please try again later" },
});

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", requireAuth, me);

router.post(
  "/forgot-password",
  forgotPasswordLimit,
  validate(forgotPasswordSchema),
  forgotPassword
);
router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  resetPassword
);

export default router;