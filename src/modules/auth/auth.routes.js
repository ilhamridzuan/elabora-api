import express from "express";
import { AuthController } from "./auth.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import { 
  registerPasienSchema, 
  registerDokterSchema, 
  registerPetugasSchema, 
  loginSchema 
} from "./auth.validators.js";
import { loginLimiter, registerLimiter } from "../../middleware/rateLimiter.middleware.js";

const router = express.Router();

router.post("/register", registerLimiter, validate(registerPasienSchema), AuthController.register);
router.post("/register-dokter", registerLimiter, validate(registerDokterSchema), AuthController.registerDokter);
router.post("/register-petugas", registerLimiter, validate(registerPetugasSchema), AuthController.registerPetugas);
router.post("/login", loginLimiter, validate(loginSchema), AuthController.login);
router.get("/me", requireAuth, AuthController.me);

export default router;