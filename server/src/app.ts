import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import swaggerUi from "swagger-ui-express";

dotenv.config();
import { connectDB } from "./db";
import authRoutes from "./routes/authRoutes";
import teamRoutes from "./routes/teamRoutes";
import bugRoutes from "./routes/bugRoutes";
import bugDetailRoutes from "./routes/bugDetailRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { swaggerSpec } from "./swagger";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

// Serves uploaded files directly, e.g. GET http://localhost:4000/uploads/abc123.png
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Interactive API docs — http://localhost:4000/api-docs
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/teams/:teamId/bugs", bugRoutes); // e.g. POST /api/teams/<id>/bugs
app.use("/api/bugs", bugDetailRoutes); // e.g. PATCH /api/bugs/<id>/status, POST /api/bugs/draft (AI-assisted drafting lives in here now — see note below)

// Must be registered LAST, after all routes — this is what actually
// catches errors passed via next(err) from asyncHandler-wrapped controllers
app.use(errorHandler);

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();

// NOTE: the AI drafting route (POST /api/bugs/draft) used to live in its own
// aiRoutes.ts, mounted separately here with a 5th app.use(...) call. That
// combination hit a real bug in this project's installed express@5.3.0 /
// router@2.2.0 — the 10th middleware layer registered on the app always
// failed to mount with "argument handler must be a function", regardless of
// which router occupied that slot. Folding the /draft route directly into
// bugDetailRoutes.ts (already mounted at /api/bugs) removes one whole
// app.use(...) call and avoids the bug entirely, with no change to the URL
// the frontend calls. aiRoutes.ts and its app.use/import lines can be
// deleted — they're no longer used.