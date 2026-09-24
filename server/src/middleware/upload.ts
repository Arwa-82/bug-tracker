import multer from "multer";
import path from "path";
import crypto from "crypto";
import { Request } from "express";

// Configure where files get saved and what they get named
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: (_req, file, cb) => {
    const uniqueName = crypto.randomBytes(16).toString("hex");
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueName}${ext}`);
  },
});

// Only allow image and video files — reject everything else
function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  const allowed = /^(image|video)\//;
  if (allowed.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image and video files are allowed"));
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    // Raised from 25MB to 100MB to accommodate short screen recordings.
    // Still capped — uncapped uploads would let anyone fill your disk
    // or MongoDB Atlas storage with huge files.
    fileSize: 100 * 1024 * 1024,
  },
});