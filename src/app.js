import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import fs from "fs";
import path from "path";

import authRoutes from "./modules/auth/auth.routes.js";
import registrationRoutes from "./modules/registrations/registration.routes.js";
import patientsRoutes from "./modules/patients/patients.routes.js";
import queueRoutes from "./modules/queue/queue.routes.js";
import examsRoutes from "./modules/exams/exams.routes.js";
import auditRoutes from "./modules/audit/audit.routes.js";

import { notFound, errorHandler } from "./middleware/error.middleware.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const uploadBase = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadBase, { recursive: true });
fs.mkdirSync(path.join(uploadBase, "exams"), { recursive: true });
fs.mkdirSync(path.join(uploadBase, "referrals"), { recursive: true });

app.use("/uploads", express.static(uploadBase));

app.get("/", (req, res) => {
  res.json({ message: "eLabora API is running" });
});

app.use("/auth", authRoutes);
app.use("/registrations", registrationRoutes);
app.use("/patients", patientsRoutes);
app.use("/queue", queueRoutes);
app.use("/exams", examsRoutes);
app.use("/audit-logs", auditRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
