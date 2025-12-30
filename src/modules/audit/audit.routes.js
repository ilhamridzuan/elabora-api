import express from 'express';
import { AuditController } from './audit.controller.js';
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";

const router = express.Router();

// hanya PETUGAS
router.get('/', requireAuth, requireRole('PETUGAS'), AuditController.index);

export default router;
