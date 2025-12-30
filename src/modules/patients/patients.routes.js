import express from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { listPatients, getPatientDetail } from "./patients.controller.js";

const router = express.Router();

// Dokter dan Petugas boleh akses
router.get("/", requireAuth, requireRole("DOKTER", "PETUGAS"), listPatients);
router.get("/:id", requireAuth, requireRole("DOKTER", "PETUGAS"), getPatientDetail);
export default router;
