
import { Router } from "express";
import { register, login, me } from "../controllers/auth";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { registerSchema, loginSchema } from "../schemas/authSchemas";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.get("/me", requireAuth, me);

export default router;
