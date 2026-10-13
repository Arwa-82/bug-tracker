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

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Create a new account
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Jane Doe
 *               email:
 *                 type: string
 *                 example: jane@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: password123
 *     responses:
 *       201:
 *         description: Account created — returns a JWT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error, or email already in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/register", validate(registerSchema), register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Log in with email and password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: mobile-admin@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Logged in — returns a JWT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/login", validate(loginSchema), login);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get the currently authenticated user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: The logged-in user's profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/me", requireAuth, me);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     description: >
 *       Always returns a generic success message, whether or not the email
 *       exists, to avoid revealing which accounts are registered.
 *       Rate-limited to 5 requests per 15 minutes per IP.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: mobile-admin@example.com
 *     responses:
 *       200:
 *         description: Generic confirmation message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       429:
 *         description: Too many requests — rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/forgot-password",
  forgotPasswordLimit,
  validate(forgotPasswordSchema),
  forgotPassword
);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Set a new password using an emailed reset token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *                 description: The reset token from the emailed link
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  resetPassword
);

export default router;