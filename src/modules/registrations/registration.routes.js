import express from "express";
import { RegistrationController } from "./registration.controller.js";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

const uploadDir = path.resolve("src/uploads/surat-rujukan");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `rujukan_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const okMime = ["image/jpeg", "image/png", "application/pdf"];
  if (!okMime.includes(file.mimetype)) {
    return cb(new Error("File harus jpg/png/pdf"));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Pasien
router.post(
  "/",
  requireAuth,
  requireRole("PASIEN"),
  upload.single("surat_rujukan"),
  RegistrationController.create
);

router.get("/me", requireAuth, requireRole("PASIEN"), RegistrationController.listMine);
router.get("/queue/today", requireAuth, requireRole("PASIEN"), RegistrationController.queueToday);

export default router;
