import path from "path";
import crypto from "crypto";
import { db } from "../../config/db.js";
import { ExamsRepository } from "./exams.repository.js";
import { AuditRepository } from "../audit/audit.repository.js";
import { blobService } from "../../services/blob.service.js";

const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);
const ALLOWED_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png"]);
const MIME_TO_TYPE = { "application/pdf": "PDF", "image/jpeg": "JPG", "image/png": "PNG" };

function validate(file) {
    if (!file) {
        const e = new Error("File wajib diupload"); e.statusCode = 400; throw e;
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME.has(file.mimetype) || !ALLOWED_EXT.has(ext)) {
        const e = new Error("Format file tidak diizinkan"); e.statusCode = 422; throw e;
    }
    if (file.size > 5 * 1024 * 1024) {
        const e = new Error("File size exceeds 5MB limit"); e.statusCode = 422; throw e;
    }
    return ext;
}

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
        const ext = validate(file);
        const blobName = `${pemeriksaanId}/${crypto.randomUUID()}${ext}`;
        const sha256 = blobService.constructor.sha256(file.buffer);

        try {
            await blobService.upload({
                container: blobService.containerExams,
                blobName,
                buffer: file.buffer,
                contentType: file.mimetype,
                originalFilename: file.originalname,
            });
        } catch (e) {
            const err = new Error("Layanan penyimpanan tidak tersedia, silakan coba lagi");
            err.statusCode = 502;
            err.cause = e;
            throw err;
        }

        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            await ExamsRepository.insertFile(conn, {
                pemeriksaan_id: pemeriksaanId,
                blob_name: blobName,
                container: blobService.containerExams,
                content_type: file.mimetype,
                size_bytes: file.size,
                sha256,
                file_type: MIME_TO_TYPE[file.mimetype],
            });
            await AuditRepository.insert(conn, {
                entity: "pemeriksaan",
                entity_id: pemeriksaanId,
                aksi: "UPDATE",
                changed_by_akun_id: akunId,
                detail: { blob_name: blobName, container: blobService.containerExams },
            });
            await conn.commit();
            return await ExamsRepository.listFiles(conn, pemeriksaanId);
        } catch (e) {
            await conn.rollback();
            await blobService
                .deleteBlob({ container: blobService.containerExams, blobName })
                .catch((de) => console.error("compensating delete failed", de));
            throw e;
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
    },

    async replaceFile(examId, fileId, file, user) {
        const akunId = user.akun_id;
        const pemeriksaanId = Number(examId);
        const ext = validate(file);
        const newBlobName = `${pemeriksaanId}/${crypto.randomUUID()}${ext}`;
        const sha256 = blobService.constructor.sha256(file.buffer);

        // Phase 1: upload new blob first (no DB touched yet)
        try {
            await blobService.upload({
                container: blobService.containerExams,
                blobName: newBlobName,
                buffer: file.buffer,
                contentType: file.mimetype,
                originalFilename: file.originalname,
            });
        } catch (e) {
            const err = new Error("Layanan penyimpanan tidak tersedia, silakan coba lagi");
            err.statusCode = 502;
            err.cause = e;
            throw err;
        }

        // Phase 2: DB transaction
        const conn = await db.getConnection();
        let oldBlob = null;
        try {
            await conn.beginTransaction();

            // Load old row; verify belongs to this exam
            const oldRow = await ExamsRepository.getFileById(conn, fileId);
            if (!oldRow || oldRow.pemeriksaan_id !== pemeriksaanId) {
                await conn.rollback();
                // Compensate: delete new blob since DB won't reference it
                await blobService
                    .deleteBlob({ container: blobService.containerExams, blobName: newBlobName })
                    .catch((de) => console.warn("compensating delete failed (404 check)", de));
                const e = new Error("File tidak ditemukan");
                e.statusCode = 404;
                throw e;
            }

            oldBlob = { container: oldRow.container || blobService.containerExams, blobName: oldRow.blob_name };

            // Update row to point at new blob
            await ExamsRepository.updateFile(conn, fileId, {
                blob_name: newBlobName,
                container: blobService.containerExams,
                content_type: file.mimetype,
                size_bytes: file.size,
                sha256,
                file_type: MIME_TO_TYPE[file.mimetype],
            });

            // Audit UPDATE with old_blob + new_blob
            await AuditRepository.insert(conn, {
                entity: "pemeriksaan",
                entity_id: pemeriksaanId,
                aksi: "UPDATE",
                changed_by_akun_id: akunId,
                detail: { old_blob: oldBlob.blobName, new_blob: newBlobName },
            });

            await conn.commit();
        } catch (e) {
            // On any error after beginTransaction (but before the 404 early-return path above)
            // rollback and compensate new blob
            if (e.statusCode !== 404) {
                await conn.rollback().catch(() => {});
                await blobService
                    .deleteBlob({ container: blobService.containerExams, blobName: newBlobName })
                    .catch((de) => console.warn("compensating delete on DB error failed", de));
            }
            throw e;
        } finally {
            conn.release();
        }

        // Post-commit: delete old blob best-effort
        if (oldBlob && oldBlob.blobName) {
            await blobService
                .deleteBlob(oldBlob)
                .catch((e) => console.warn("old blob delete failed (best-effort)", { ...oldBlob, err: e.message }));
        }

        // Return updated file metadata
        const conn2 = await db.getConnection();
        try {
            return await ExamsRepository.getFileById(conn2, fileId);
        } finally {
            conn2.release();
        }
    },

    async downloadFile({ pemeriksaanId, fileId, user }) {
        const conn = await db.getConnection();
        try {
            // Load exam — 404 if not found
            const exam = await ExamsRepository.getDetail(conn, pemeriksaanId);
            if (!exam) {
                const e = new Error("Pemeriksaan tidak ditemukan");
                e.statusCode = 404;
                throw e;
            }

            // Load file row — 404 if not found or belongs to different exam
            const fileRow = await ExamsRepository.getFileById(conn, fileId);
            if (!fileRow || fileRow.pemeriksaan_id !== pemeriksaanId) {
                const e = new Error("File tidak ditemukan");
                e.statusCode = 404;
                throw e;
            }

            // RBAC check
            if (user.role === "PASIEN") {
                // Need to resolve pasien_id from akun_id since JWT only has akun_id
                const pasien = await ExamsRepository.findPasienByAkunId(conn, user.akun_id);
                if (!pasien || pasien.id !== exam.pasien_id) {
                    const e = new Error("Akses ditolak");
                    e.statusCode = 403;
                    throw e;
                }
            } else if (!["PETUGAS", "DOKTER"].includes(user.role)) {
                const e = new Error("Akses ditolak");
                e.statusCode = 403;
                throw e;
            }

            // Check blob exists in storage
            const exists = await blobService.exists({
                container: fileRow.container,
                blobName: fileRow.blob_name,
            });
            if (!exists) {
                const e = new Error("File tidak ditemukan");
                e.statusCode = 404;
                throw e;
            }

            // Generate SAS URL — 502 on error
            let sas;
            try {
                sas = await blobService.generateReadSas({
                    container: fileRow.container,
                    blobName: fileRow.blob_name,
                });
            } catch (e) {
                const err = new Error("Gagal membuat link unduhan, silakan coba lagi");
                err.statusCode = 502;
                err.cause = e;
                throw err;
            }

            // Best-effort audit READ — fire-and-forget
            AuditRepository.insert(conn, {
                entity: "pemeriksaan",
                entity_id: pemeriksaanId,
                aksi: "READ",
                changed_by_akun_id: user.akun_id,
                detail: { blob_name: fileRow.blob_name, file_id: fileId },
            }).catch((e) => console.warn("audit insert failed (best-effort):", e.message));

            return {
                url: sas.url,
                expires_at: sas.expiresAt,
                content_type: fileRow.content_type,
                filename: fileRow.original_filename || path.basename(fileRow.blob_name),
            };
        } finally {
            conn.release();
        }
    },

    async deleteExam({ pemeriksaanId, akunId }) {
        const conn = await db.getConnection();
        let toDelete = [];
        try {
            await conn.beginTransaction();
            // 1) List all pemeriksaan_file rows — collect blob_name + container
            const files = await ExamsRepository.listFiles(conn, pemeriksaanId);
            toDelete = files
                .map((f) => ({ container: f.container, blobName: f.blob_name }))
                .filter((b) => b.blobName);
            // 2) Delete pemeriksaan_file rows
            await ExamsRepository.deleteFilesByExamId(conn, pemeriksaanId);
            // 3) Delete pemeriksaan row
            await ExamsRepository.deleteExam(conn, pemeriksaanId);
            // 4) Audit DELETE with detail.deleted_blobs = N
            await AuditRepository.insert(conn, {
                entity: "pemeriksaan",
                entity_id: pemeriksaanId,
                aksi: "DELETE",
                changed_by_akun_id: akunId,
                detail: { deleted_blobs: toDelete.length },
            });
            // 5) Commit
            await conn.commit();
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }
        // 6) Post-commit: best-effort blob deletion — per-blob failure → warn + continue
        for (const b of toDelete) {
            await blobService
                .deleteBlob(b)
                .catch((e) =>
                    console.warn("blob delete during exam delete failed (best-effort)", {
                        container: b.container,
                        blobName: b.blobName,
                        err: e.message,
                    })
                );
        }
        return { success: true, deletedFiles: toDelete.length };
    }
}

