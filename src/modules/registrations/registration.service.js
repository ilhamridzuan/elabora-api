import path from "path";
import crypto from "crypto";
import { db } from "../../config/db.js";
import { RegistrationRepository } from "./registration.repository.js";
import { AuditRepository } from "../audit/audit.repository.js";
import { blobService } from "../../services/blob.service.js";

const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);
const ALLOWED_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

function pad3(n) {
  return String(n).padStart(3, "0");
}
function pad4(n) {
  return String(n).padStart(4, "0");
}
function yyyymmdd(dateStr) {
  return dateStr.replaceAll("-", "");
}

export const RegistrationService = {
  async create({ akun_id, jadwal_pemeriksaan_at, tanggal_antrian, file }) {
    // --- Validate file presence ---
    if (!file) {
      const e = new Error("Surat rujukan wajib diupload");
      e.statusCode = 400;
      throw e;
    }

    // --- Validate MIME + ext ---
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME.has(file.mimetype) || !ALLOWED_EXT.has(ext)) {
      const e = new Error("Format file tidak diizinkan");
      e.statusCode = 422;
      throw e;
    }

    // --- Validate size (multer limit catches most, but guard here too) ---
    if (file.size > 5 * 1024 * 1024) {
      const e = new Error("File size exceeds 5MB limit");
      e.statusCode = 422;
      throw e;
    }

    // --- Build blob name: {YYYY}/{MM}/{uuid}{ext} (UTC) ---
    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const blobName = `${yyyy}/${mm}/${crypto.randomUUID()}${ext}`;

    // --- Compute SHA-256 ---
    const sha256 = blobService.constructor.sha256(file.buffer);

    // --- Phase 1: blob upload (outside DB tx) ---
    try {
      await blobService.upload({
        container: blobService.containerReferrals,
        blobName,
        buffer: file.buffer,
        contentType: file.mimetype,
        originalFilename: file.originalname,
      });
    } catch (uploadErr) {
      const e = new Error("Gagal mengunggah surat rujukan, silakan coba lagi");
      e.statusCode = 502;
      e.cause = uploadErr;
      throw e;
    }

    // --- Phase 2: DB transaction ---
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const pasien = await RegistrationRepository.findPasienByAkunId(conn, akun_id);
      if (!pasien) {
        await conn.rollback();
        // compensate: delete uploaded blob
        await blobService
          .deleteBlob({ container: blobService.containerReferrals, blobName })
          .catch((de) => console.error("[RegistrationService] compensating delete failed", de));
        return { ok: false, status: 404, message: "Pasien tidak ditemukan" };
      }

      const lastNo = await RegistrationRepository.getLastQueueNumberForDate(conn, tanggal_antrian);
      const nextNo = (lastNo || 0) + 1;

      const pendaftaranId = await RegistrationRepository.insertPendaftaran(conn, {
        pasien_id: pasien.id,
        no_antrian: nextNo,
        tanggal_antrian,
        jadwal_pemeriksaan_at,
        status: "MENUNGGU",
        surat_rujukan_blob_name: blobName,
        surat_rujukan_container: blobService.containerReferrals,
        surat_rujukan_content_type: file.mimetype,
        surat_rujukan_size_bytes: file.size,
        surat_rujukan_sha256: sha256,
      });

      const noLab = `LAB-${yyyymmdd(tanggal_antrian)}-${pad4(pendaftaranId)}`;
      await RegistrationRepository.updateNoLab(conn, pendaftaranId, noLab);

      await AuditRepository.insert(conn, {
        entity: "registrasi",
        entity_id: pendaftaranId,
        aksi: "CREATE",
        changed_by_akun_id: akun_id,
        detail: { blob_name: blobName, container: blobService.containerReferrals },
      });

      await conn.commit();

      return {
        id: pendaftaranId,
        no_antrian: pad3(nextNo),
        no_lab: noLab,
        status: "MENUNGGU",
        tanggal_antrian,
        jadwal_pemeriksaan_at,
      };
    } catch (e) {
      await conn.rollback();
      // compensating delete on DB failure
      await blobService
        .deleteBlob({ container: blobService.containerReferrals, blobName })
        .catch((de) => console.error("[RegistrationService] compensating delete failed", de));
      throw e;
    } finally {
      conn.release();
    }
  },

  async listMine({ akun_id, tanggal }) {
    const conn = await db.getConnection();
    try {
      const pasien = await RegistrationRepository.findPasienByAkunId(conn, akun_id);
      if (!pasien) return [];
      return await RegistrationRepository.listByPasienId(conn, pasien.id, tanggal);
    } finally {
      conn.release();
    }
  },

  async queueToday({ akun_id }) {
    const conn = await db.getConnection();
    try {
      const pasien = await RegistrationRepository.findPasienByAkunId(conn, akun_id);
      if (!pasien) return { my: null, stats: null };

      const today = todayISO();
      const my = await RegistrationRepository.findMyQueueToday(conn, pasien.id, today);
      const stats = await RegistrationRepository.getQueueStats(conn, today);

      return { my, stats, tanggal: today };
    } finally {
      conn.release();
    }
  },

  async downloadRujukan({ pendaftaranId, user }) {
    const conn = await db.getConnection();
    try {
      const reg = await RegistrationRepository.findById(conn, pendaftaranId);
      if (!reg || !reg.surat_rujukan_blob_name) {
        const e = new Error("File tidak ditemukan");
        e.statusCode = 404;
        throw e;
      }

      // RBAC check
      if (user.role === "PASIEN") {
        const pasien = await RegistrationRepository.findPasienByAkunId(conn, user.akun_id);
        if (!pasien || pasien.id !== reg.pasien_id) {
          const e = new Error("Akses ditolak");
          e.statusCode = 403;
          throw e;
        }
      } else if (!["PETUGAS", "DOKTER"].includes(user.role)) {
        const e = new Error("Akses ditolak");
        e.statusCode = 403;
        throw e;
      }

      // Check blob exists
      const exists = await blobService.exists({
        container: reg.surat_rujukan_container,
        blobName: reg.surat_rujukan_blob_name,
      });
      if (!exists) {
        const e = new Error("File tidak ditemukan");
        e.statusCode = 404;
        throw e;
      }

      // Generate SAS URL
      let sas;
      try {
        sas = await blobService.generateReadSas({
          container: reg.surat_rujukan_container,
          blobName: reg.surat_rujukan_blob_name,
        });
      } catch (sasErr) {
        const e = new Error("Gagal membuat link unduhan, silakan coba lagi");
        e.statusCode = 502;
        e.cause = sasErr;
        throw e;
      }

      // Best-effort audit (not awaited, failure must not block response)
      AuditRepository.insert(conn, {
        entity: "registrasi",
        entity_id: pendaftaranId,
        aksi: "READ",
        changed_by_akun_id: user.akun_id,
        detail: { blob_name: reg.surat_rujukan_blob_name },
      }).catch((e) => console.warn("[RegistrationService] audit insert failed", e));

      return {
        url: sas.url,
        expires_at: sas.expiresAt,
        content_type: reg.surat_rujukan_content_type,
        filename: path.basename(reg.surat_rujukan_blob_name),
      };
    } finally {
      conn.release();
    }
  },
};
