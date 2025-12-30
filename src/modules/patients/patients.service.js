import { db } from "../../config/db.js";
import { PatientsRepository } from "./patients.repository.js";

export const PatientsService = {
  async list({ search, page = 1, pageSize = 20 }) {
    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const offset = (p - 1) * ps;

    const conn = await db.getConnection();
    try {
      const [items, total] = await Promise.all([
        PatientsRepository.list(conn, { search, limit: ps, offset }),
        PatientsRepository.count(conn, { search }),
      ]);
      return { items, page: p, pageSize: ps, total };
    } finally {
      conn.release();
    }
  },

  async detail(patientId) {
    const conn = await db.getConnection();
    try {
      const patient = await PatientsRepository.findById(conn, patientId);
      if (!patient) {
        const err = new Error("Patient not found");
        err.statusCode = 404;
        throw err;
      }
      return patient;
    } finally {
      conn.release();
    }
  },
};
