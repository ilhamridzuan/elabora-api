import express from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { listPatients, getPatientDetail, advancedSearch } from "./patients.controller.js";
import { advancedSearchValidation } from "./patients.validators.js";

const router = express.Router();

// Advanced search endpoint - POST /search
router.post("/search", requireAuth, requireRole("DOKTER", "PETUGAS"), advancedSearchValidation, advancedSearch);

// Dokter dan Petugas boleh akses
router.get("/", requireAuth, requireRole("DOKTER", "PETUGAS"), listPatients);
router.get("/:id", requireAuth, requireRole("DOKTER", "PETUGAS"), getPatientDetail);
export default router;
