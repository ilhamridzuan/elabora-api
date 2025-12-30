import express from "express";
import { AuthController } from "./auth.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", AuthController.register);
router.post("/register-dokter", AuthController.registerDokter);
router.post("/register-petugas", AuthController.registerPetugas);
router.post("/login", AuthController.login);
router.get("/me", requireAuth, AuthController.me);

export default router;