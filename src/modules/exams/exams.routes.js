import express from "express";
import multer from "multer";
import path from "path";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { createExam, getDetail, patchExam, uploadExamFile, listByPatient, listAll } from "./exams.controller.js";

const router = express.Router();

// upload storage (local)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.resolve("uploads")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || "";
    const safe = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
    cb(null, safe);
  },
});

const upload = multer({ storage });

router.get("/all", requireAuth, requireRole("PETUGAS", "DOKTER") , listAll);
// lihat list pemeriksaan pasien
router.get("/patients/:pasienId", requireAuth, listByPatient);
// detail pemeriksaan
router.get("/:id", requireAuth, getDetail); 

// Petugas: CRUD hasil
router.post("/", requireAuth, requireRole("PETUGAS"), createExam);
router.patch("/:id", requireAuth, requireRole("PETUGAS"), patchExam);
router.post("/:id/files", requireAuth, requireRole("PETUGAS"), upload.single("file"), uploadExamFile);

export default router;
