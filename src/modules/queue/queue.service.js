import { db } from "../../config/db.js";
import { QueueRepository } from "./queue.repository.js";
import { AuditRepository } from "../audit/audit.repository.js";
import { FcmService } from "../../services/fcm.service.js";

function todayISO() {
  // Return current date in Asia/Jakarta (WIB) in YYYY-MM-DD format
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

export const QueueService = {
  async listToday(date) {
    const tanggal = date || todayISO();
    const conn = await db.getConnection();
    try {
      const data = await QueueRepository.listToday(conn, tanggal);
      return { tanggal, data };
    } finally {
      conn.release();
    }
  },

  /**
   * Petugas memanggil pendaftaran -> status jadi DILAYANI
   * + audit log
   * + kirim push notif ke pasien pemilik pendaftaran (jika punya device token)
   */
  async call({ pendaftaranId, actorAkunId }) {
    const conn = await db.getConnection();
    let target = null;

    try {
      await conn.beginTransaction();

      const row = await QueueRepository.getById(conn, pendaftaranId);
      if (!row) {
        throw Object.assign(new Error("Pendaftaran tidak ditemukan"), { statusCode: 404 });
      }

      const from = row.status;
      const to = "DILAYANI";

      // (Opsional) kalau sudah DILAYANI, tidak perlu update ulang
      if (from !== to) {
        await QueueRepository.updateStatus(conn, { id: pendaftaranId, status: to });

        await AuditRepository.insert(conn, {
          entity: "pendaftaran",
          entity_id: pendaftaranId,
          aksi: "UPDATE",
          changed_by_akun_id: actorAkunId,
          detail: { from, to },
        });
      }

      // ambil info pasien+akun utk notif sebelum commit
      // (query join pasien->akun, dll)
      target = await QueueRepository.getDetailForNotify(conn, pendaftaranId);

      await conn.commit();

      // kirim notif setelah commit (supaya status sudah benar-benar tersimpan)
      if (target?.akun_id) {
        await FcmService.notifyAkun({
          akun_id: target.akun_id,
          title: "Antrian Dipanggil",
          body: `Nomor antrian Anda ${String(target.no_antrian).padStart(3, "0")} sedang dipanggil`,
          data: {
            type: "QUEUE_CALLED",
            pendaftaran_id: String(target.pendaftaran_id),
            no_antrian: String(target.no_antrian),
            tanggal_antrian: String(target.tanggal_antrian),
          },
        });
      }

      return { id: pendaftaranId, status: to };
    } catch (e) {
      try {
        await conn.rollback();
      } catch {}
      throw e;
    } finally {
      conn.release();
    }
  },

  async cancel({ pendaftaranId, actorAkunId, reason }) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const row = await QueueRepository.getById(conn, pendaftaranId);
      if (!row) throw Object.assign(new Error("Pendaftaran tidak ditemukan"), { statusCode: 404 });

      const from = row.status;
      const to = "DIBATALKAN";

      if (from !== to) {
        await QueueRepository.updateStatus(conn, { id: pendaftaranId, status: to });

        await AuditRepository.insert(conn, {
          entity: "pendaftaran",
          entity_id: pendaftaranId,
          aksi: "UPDATE",
          changed_by_akun_id: actorAkunId,
          detail: { from, to, reason: reason || null },
        });
      }

      await conn.commit();
      return { id: pendaftaranId, status: to };
    } catch (e) {
      try { await conn.rollback(); } catch {}
      throw e;
    } finally {
      conn.release();
    }
  },

  /**
   * Mark current as SELESAI, then set next MENUNGGU as DILAYANI.
   * + kirim push notif untuk next yang dipanggil
   */
  async next({ currentId, actorAkunId }) {
    const conn = await db.getConnection();
    let targetNext = null;

    try {
      await conn.beginTransaction();

      const cur = await QueueRepository.getById(conn, currentId);
      if (!cur) throw Object.assign(new Error("Pendaftaran tidak ditemukan"), { statusCode: 404 });

      // finish current
      if (cur.status !== "SELESAI") {
        await QueueRepository.updateStatus(conn, { id: currentId, status: "SELESAI" });

        await AuditRepository.insert(conn, {
          entity: "pendaftaran",
          entity_id: currentId,
          aksi: "UPDATE",
          changed_by_akun_id: actorAkunId,
          detail: { from: cur.status, to: "SELESAI" },
        });
      }

      // call next waiting in the same date
      const nextRow = await QueueRepository.findNextWaiting(conn, cur.tanggal_antrian);

      if (!nextRow) {
        await conn.commit();
        return { finished: currentId, next: null };
      }

      // set next -> DILAYANI
      await QueueRepository.updateStatus(conn, { id: nextRow.id, status: "DILAYANI" });

      await AuditRepository.insert(conn, {
        entity: "pendaftaran",
        entity_id: nextRow.id,
        aksi: "UPDATE",
        changed_by_akun_id: actorAkunId,
        detail: { from: "MENUNGGU", to: "DILAYANI", autoNext: true },
      });

      // ambil info pasien+akun utk notif sebelum commit
      targetNext = await QueueRepository.getDetailForNotify(conn, nextRow.id);

      await conn.commit();

      // kirim notif ke pasien next
      if (targetNext?.akun_id) {
        await FcmService.notifyAkun({
          akun_id: targetNext.akun_id,
          title: "Antrian Dipanggil",
          body: `Nomor antrian Anda ${String(targetNext.no_antrian).padStart(3, "0")} sedang dipanggil`,
          data: {
            type: "QUEUE_CALLED",
            pendaftaran_id: String(targetNext.pendaftaran_id),
            no_antrian: String(targetNext.no_antrian),
            tanggal_antrian: String(targetNext.tanggal_antrian),
            autoNext: "true",
          },
        });
      }

      return { finished: currentId, next: { id: nextRow.id, status: "DILAYANI" } };
    } catch (e) {
      try { await conn.rollback(); } catch {}
      throw e;
    } finally {
      conn.release();
    }
  },

  async queueStats() {
    const conn = await db.getConnection();
    try {
      const today = todayISO();
      const stats = await QueueRepository.getQueueStats(conn, today);
      return { stats, tanggal: today };
    } finally {
      conn.release();
    }
  },
};
