import path from "path";
import fs from "fs";
import { db } from "../../config/db.js";
import { ExamsRepository } from "./exams.repository.js";
import { AuditRepository } from "../audit/audit.repository.js";

// File validation utilities
function validateFileSize(file, maxSizeMB) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        const err = new Error(`File size exceeds ${maxSizeMB}MB limit`);
        err.statusCode = 422;
        throw err;
    }
}

function validateFileExtension(file, allowedExtensions) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
        const err = new Error(`Invalid file extension. Allowed: ${allowedExtensions.join(', ')}`);
        err.statusCode = 422;
        throw err;
    }
}

function validateFileMimeType(file, allowedMimeTypes) {
    if (!allowedMimeTypes.includes(file.mimetype)) {
        const err = new Error(`Invalid file MIME type. Allowed: ${allowedMimeTypes.join(', ')}`);
        err.statusCode = 422;
        throw err;
    }
}

// File cleanup utility
async function deleteFileFromDisk(filePath) {
    try {
        await fs.promises.unlink(filePath);
        console.log(`Successfully deleted file: ${filePath}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File not found - log but don't throw
            console.warn(`File not found, skipping deletion: ${filePath}`);
        } else if (error.code === 'EACCES' || error.code === 'EPERM') {
            // Permission error - log and throw
            console.error(`Permission denied when deleting file: ${filePath}`);
            throw error;
        } else {
            // Other errors - log and throw
            console.error(`Error deleting file ${filePath}:`, error);
            throw error;
        }
    }
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
        // Validate file at the beginning before any operations
        validateFileSize(file, 5);
        validateFileExtension(file, ['.pdf', '.jpg', '.jpeg', '.png']);
        validateFileMimeType(file, ['application/pdf', 'image/jpeg', 'image/png']);

        // store relative path for DB
        const relative = path.posix.join("/uploads", path.basename(file.path));

        const conn = await db.getConnection();
        try {
            // Begin transaction
            await conn.beginTransaction();

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

                // Commit transaction on success
                await conn.commit();

                return await ExamsRepository.listFiles(conn, pemeriksaanId);
            } catch (error) {
                // Rollback transaction on any error
                await conn.rollback();
                
                // Delete the uploaded file from disk
                await deleteFileFromDisk(file.path);
                
                throw error;
            }
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

    async updateExamFile({ pemeriksaanId, file, akunId }) {
        // Validate new file at the beginning before any operations
        validateFileSize(file, 5);
        validateFileExtension(file, ['.pdf', '.jpg', '.jpeg', '.png']);
        validateFileMimeType(file, ['application/pdf', 'image/jpeg', 'image/png']);

        // Store relative path for DB
        const relative = path.posix.join("/uploads", path.basename(file.path));

        const conn = await db.getConnection();
        try {
            // Begin transaction
            await conn.beginTransaction();

            try {
                // 1) Retrieve old file paths from database
                const oldFiles = await ExamsRepository.listFiles(conn, pemeriksaanId);
                
                // 2) Detect file_type according to DB ENUM
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

                // 3) Insert new file record in database
                await ExamsRepository.insertFile(conn, {
                    pemeriksaan_id: pemeriksaanId,
                    file_path: relative,
                    file_type: fileType,
                });

                // 4) Insert audit log
                await AuditRepository.insert(conn, {
                    entity: "pemeriksaan",
                    entity_id: pemeriksaanId,
                    aksi: "UPDATE",
                    changed_by_akun_id: akunId,
                    detail: "File replaced for pemeriksaan",
                });

                // 5) Commit transaction
                await conn.commit();

                // 6) Delete old files from disk (after successful commit)
                for (const oldFile of oldFiles) {
                    const oldFilePath = path.join(process.cwd(), oldFile.file_path);
                    await deleteFileFromDisk(oldFilePath);
                }

                return await ExamsRepository.listFiles(conn, pemeriksaanId);
            } catch (error) {
                // Rollback transaction on any error
                await conn.rollback();
                
                // Delete the new uploaded file from disk
                await deleteFileFromDisk(file.path);
                
                throw error;
            }
        } finally {
            conn.release();
        }
    },

    async deleteExam({ pemeriksaanId, akunId }) {
        const conn = await db.getConnection();
        try {
            // Begin transaction
            await conn.beginTransaction();

            try {
                // 1) Retrieve all file paths for exam
                const files = await ExamsRepository.listFiles(conn, pemeriksaanId);
                
                // 2) Delete file records from database
                await ExamsRepository.deleteFilesByExamId(conn, pemeriksaanId);
                
                // 3) Delete exam record from database
                await ExamsRepository.deleteExam(conn, pemeriksaanId);
                
                // 4) Insert audit log
                await AuditRepository.insert(conn, {
                    entity: "pemeriksaan",
                    entity_id: pemeriksaanId,
                    aksi: "DELETE",
                    changed_by_akun_id: akunId,
                    detail: "Pemeriksaan deleted with files",
                });

                // 5) Commit transaction
                await conn.commit();

                // 6) Delete all files from disk (after successful commit)
                for (const file of files) {
                    const filePath = path.join(process.cwd(), file.file_path);
                    await deleteFileFromDisk(filePath);
                }

                return { success: true, deletedFiles: files.length };
            } catch (error) {
                // Rollback transaction on failure (files remain on disk for safety)
                await conn.rollback();
                throw error;
            }
        } finally {
            conn.release();
        }
    }
}

