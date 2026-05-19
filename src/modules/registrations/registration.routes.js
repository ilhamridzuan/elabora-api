import express from "express";
import multer from "multer";
import { RegistrationController } from "./registration.controller.js";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ["application/pdf", "image/jpeg", "image/png"].includes(file.mimetype);
    if (!ok) return cb(new Error("MIME tidak diizinkan"));
    cb(null, true);
  },
});

router.post(
  "/",
  requireAuth,
  requireRole("PASIEN"),
  upload.single("surat_rujukan"),
  RegistrationController.create
);

router.get("/me", requireAuth, requireRole("PASIEN"), RegistrationController.listMine);
router.get("/queue/today", requireAuth, requireRole("PASIEN"), RegistrationController.queueToday);
router.get("/:id/surat-rujukan/download", requireAuth, RegistrationController.downloadRujukan);

export default router;
