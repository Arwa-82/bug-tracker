import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";

dotenv.config();
import { connectDB } from "./db";
import authRoutes from "./routes/authRoutes";
import teamRoutes from "./routes/teamRoutes";
import bugRoutes from "./routes/bugRoutes";
import bugDetailRoutes from "./routes/bugDetailRoutes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

// Serves uploaded files directly, e.g. GET http://localhost:4000/uploads/abc123.png
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/teams/:teamId/bugs", bugRoutes); // e.g. POST /api/teams/<id>/bugs
app.use("/api/bugs", bugDetailRoutes); // e.g. PATCH /api/bugs/<id>/status

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