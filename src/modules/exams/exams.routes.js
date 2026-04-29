import express from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { createExam, getDetail, patchExam, uploadExamFile, listByPatient, listAll, updateExamFile, deleteExam } from "./exams.controller.js";

const router = express.Router();

// upload storage (local)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.resolve("uploads")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const safe = `${crypto.randomUUID()}${ext}`;
    cb(null, safe);
  },
});

// File extension validation function
const validateFileExtension = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error('Invalid file extension. Allowed: .pdf, .jpg, .jpeg, .png'), false);
  }
  
  cb(null, true);
};

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: validateFileExtension
});

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(422).json({
        message: 'File size exceeds 5MB limit'
      });
    }
    // Handle other multer errors
    return res.status(422).json({
      message: err.message
    });
  }
  
  // Handle file extension validation errors
  if (err.message === 'Invalid file extension. Allowed: .pdf, .jpg, .jpeg, .png') {
    return res.status(422).json({
      message: err.message
    });
  }
  
  // Pass non-multer errors to next error handler
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
router.patch("/:id/files/:fileId", requireAuth, requireRole("PETUGAS"), upload.single("file"), handleMulterError, updateExamFile);
router.delete("/:id", requireAuth, requireRole("PETUGAS"), deleteExam);

export default router;
