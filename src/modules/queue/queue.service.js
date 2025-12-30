import { db } from "../../config/db.js";
import { QueueRepository } from "./queue.repository.js";
import { AuditRepository } from "../audit/audit.repository.js";

function todayISO() {
  // Return current date in Asia/Jakarta (WIB) in YYYY-MM-DD format
  // Using en-CA locale produces ISO-like date strings (YYYY-MM-DD)
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

  async call({ pendaftaranId, actorAkunId }) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const row = await QueueRepository.getById(conn, pendaftaranId);
      if (!row) throw Object.assign(new Error("Pendaftaran tidak ditemukan"), { statusCode: 404 });

      const from = row.status;
      const to = "DILAYANI";

      await QueueRepository.updateStatus(conn, { id: pendaftaranId, status: to });
      await AuditRepository.insert(conn, {
        entity: "pendaftaran",
        entity_id: pendaftaranId,
        aksi: "UPDATE_STATUS",
        changed_by_akun_id: actorAkunId,
        detail: { from, to },
      });

      await conn.commit();
      return { id: pendaftaranId, status: to };
    } catch (e) {
      try { await conn.rollback(); } catch {}
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
      await QueueRepository.updateStatus(conn, { id: pendaftaranId, status: to });
      await AuditRepository.insert(conn, {
        entity: "pendaftaran",
        entity_id: pendaftaranId,
        aksi: "UPDATE_STATUS",
        changed_by_akun_id: actorAkunId,
        detail: { from, to, reason: reason || null },
      });

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
   */
  async next({ currentId, actorAkunId }) {
    const conn = await db.getConnection();
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
          aksi: "UPDATE_STATUS",
          changed_by_akun_id: actorAkunId,
          detail: { from: cur.status, to: "SELESAI" },
        });
      }

      // call next
      const nextRow = await QueueRepository.findNextWaiting(conn, cur.tanggal_antrian);
      if (!nextRow) {
        await conn.commit();
        return { finished: currentId, next: null };
      }

      await QueueRepository.updateStatus(conn, { id: nextRow.id, status: "DILAYANI" });
      await AuditRepository.insert(conn, {
        entity: "pendaftaran",
        entity_id: nextRow.id,
        aksi: "UPDATE_STATUS",
        changed_by_akun_id: actorAkunId,
        detail: { from: "MENUNGGU", to: "DILAYANI", autoNext: true },
      });

      await conn.commit();
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
