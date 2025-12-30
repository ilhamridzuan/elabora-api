import express from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { listToday, callQueue, nextQueue, cancelQueue, queueStats } from "./queue.controller.js";

const router = express.Router();

router.get("/today", requireAuth, listToday);
router.get("/stats", requireAuth, queueStats);
// Petugas only (Manajemen Antrian)
router.post("/:id/call", requireAuth, requireRole("PETUGAS"), callQueue);
router.post("/:id/next", requireAuth, requireRole("PETUGAS"), nextQueue);
router.post("/:id/cancel", requireAuth, requireRole("PETUGAS"), cancelQueue);

export default router;
