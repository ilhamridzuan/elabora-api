import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./modules/auth/auth.routes.js";
import registrationRoutes from "./modules/registrations/registration.routes.js";
import patientsRoutes from "./modules/patients/patients.routes.js";
import queueRoutes from "./modules/queue/queue.routes.js";
import examsRoutes from "./modules/exams/exams.routes.js";
import auditRoutes from "./modules/audit/audit.routes.js";
import devicesRoutes from "./modules/devices/devices.routes.js";

import { notFound, errorHandler } from "./middleware/error.middleware.js";

const app = express();

// Parse CORS allowed origins from environment variable
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'];

// Configure CORS with whitelist
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (req, res) => {
  res.json({ message: "eLabora API is running" });
});

app.use("/auth", authRoutes);
app.use("/registrations", registrationRoutes);
app.use("/patients", patientsRoutes);
app.use("/queue", queueRoutes);
app.use("/exams", examsRoutes);
app.use("/audit-logs", auditRoutes);
app.use("/devices", devicesRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
