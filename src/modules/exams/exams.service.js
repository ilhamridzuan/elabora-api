import path from "path";
import { db } from "../../config/db.js";
import { ExamsRepository } from "./exams.repository.js";
import { AuditRepository } from "../audit/audit.repository.js";

export const ExamsService = {
    async listByPatient(pasienId) {
        const conn = await db.getConnection();
        try {
            return await ExamsRepository.listByPatient(conn, { pasien_id: pasienId });
        } finally {
            conn.release();
        }
    },



    async detail(pemeriksaanId) {
        const conn = await db.getConnection();
        try {
            const item = await ExamsRepository.getDetail(conn, pemeriksaanId);
            if (!item) {
                const err = new Error("Pemeriksaan not found");
                err.statusCode = 404;
                throw err;
            }
            const files = await ExamsRepository.listFiles(conn, pemeriksaanId);
            return { ...item, files };
        } finally {
            conn.release();
        }
    },

    async create({ payload, akunId }) {
        const conn = await db.getConnection();
        try {
            const petugasLab = await ExamsRepository.findPetugasLabIdByAkunId(conn, akunId);
            if (!petugasLab) {
                throw new Error("Data petugas_lab tidak ditemukan untuk akun ini");
            }
            const petugasLabId = petugasLab.id;
            const id = await ExamsRepository.create(conn, { ...payload, petugas_lab_id: petugasLabId });
            await AuditRepository.insert(conn, {
                entity: "pemeriksaan",
                entity_id: id,
                aksi: "CREATE",
                changed_by_akun_id: akunId,
                detail: "Pemeriksaan created",
            });

            return await ExamsRepository.getDetail(conn, id);
        } finally {
            conn.release();
        }
    },

    async update(pemeriksaanId, patch, akunId) {
        const conn = await db.getConnection();
        try {
            await ExamsRepository.update(conn, pemeriksaanId, patch);
            await AuditRepository.insert(conn, {
                entity: "pemeriksaan",
                entity_id: pemeriksaanId,
                aksi: "UPDATE",
                changed_by_akun_id: akunId,
                detail: "Pemeriksaan updated",
            });
            return await ExamsRepository.getDetail(conn, pemeriksaanId);
        } finally {
            conn.release();
        }
    },

    async attachFile({ pemeriksaanId, file, akunId }) {
        const allowed = ["application/pdf", "image/jpeg", "image/png"];
        if (!allowed.includes(file.mimetype)) {
            const err = new Error("File type not allowed");
            err.statusCode = 422;
            throw err;
        }

        // store relative path for DB
        const relative = path.posix.join("/uploads", path.basename(file.path));

        const conn = await db.getConnection();
        try {
            // 1) Deteksi file_type sesuai ENUM DB
            const fileType = (() => {
                const mt = (file.mimetype || "").toLowerCase();
                if (mt === "application/pdf") return "PDF";
                if (mt === "image/png") return "PNG";
                if (mt === "image/jpeg" || mt === "image/jpg") return "JPG";
                return null;
            })();

            if (!fileType) {
                const err = new Error("File type not allowed");
                err.statusCode = 422;
                throw err;
            }

            // 2) Insert ke DB pakai ENUM
            await ExamsRepository.insertFile(conn, {
                pemeriksaan_id: pemeriksaanId,
                file_path: relative,
                file_type: fileType,
            });

            await AuditRepository.insert(conn, {
                entity: "pemeriksaan",
                entity_id: pemeriksaanId,
                aksi: "UPDATE",
                changed_by_akun_id: akunId,
                detail: "File attached to pemeriksaan",
            });

            return await ExamsRepository.listFiles(conn, pemeriksaanId);
        } finally {
            conn.release();
        }
    },

    async listAll({ q, status_hasil, page, limit }) {
        const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
        const safePage = Math.max(Number(page) || 1, 1);
        const offset = (safePage - 1) * safeLimit;

        const conn = await db.getConnection();
        try {
            const rows = await ExamsRepository.listAll(conn, {
                q,
                status_hasil,
                limit: safeLimit,
                offset,
            });

            const hasNext = rows.length > safeLimit;
            const data = hasNext ? rows.slice(0, safeLimit) : rows;

            return {
                data,
                meta: {
                    page: safePage,
                    limit: safeLimit,
                    hasNext,
                    hasPrev: safePage > 1,
                },
            };
        } finally {
            conn.release();
        }
    }
}

