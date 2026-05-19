import express from "express";
import multer from "multer";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { createExam, getDetail, patchExam, uploadExamFile, listByPatient, listAll, replaceExamFile, deleteExam, downloadFile } from "./exams.controller.js";

const router = express.Router();

// MIME whitelist fileFilter — rejects non-PDF/JPEG/PNG
const fileFilter = (req, file, cb) => {
  const allowed = ["application/pdf", "image/jpeg", "image/png"];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only PDF, JPEG, PNG allowed"), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(422).json({ message: "File size exceeds 5MB limit" });
    }
    return res.status(422).json({ message: err.message });
  }
  if (err && err.message === "Only PDF, JPEG, PNG allowed") {
    return res.status(422).json({ message: err.message });
  }
  next(err);
};

router.get("/all", requireAuth, requireRole("PETUGAS", "DOKTER") , listAll);
// lihat list pemeriksaan pasien
router.get("/patients/:pasienId", requireAuth, listByPatient);
// detail pemeriksaan
router.get("/:id", requireAuth, getDetail); 

// Petugas: CRUD hasil
router.post("/", requireAuth, requireRole("PETUGAS"), createExam);
router.patch("/:id", requireAuth, requireRole("PETUGAS"), patchExam);
router.post("/:id/files", requireAuth, requireRole("PETUGAS"), upload.single("file"), handleMulterError, uploadExamFile);
router.patch("/:id/files/:fileId", requireAuth, requireRole("PETUGAS"), upload.single("file"), handleMulterError, replaceExamFile);
router.get("/:id/files/:fileId/download", requireAuth, downloadFile);
router.delete("/:id", requireAuth, requireRole("PETUGAS"), deleteExam);

export default router;
