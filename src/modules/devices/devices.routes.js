import express from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { DevicesController } from "./devices.controller.js";

const router = express.Router();
router.post("/token", requireAuth, DevicesController.upsertToken);

export default router;
