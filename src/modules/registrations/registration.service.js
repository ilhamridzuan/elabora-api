import { db } from "../../config/db.js";
import { RegistrationRepository } from "./registration.repository.js";

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
  async create({ akun_id, jadwal_pemeriksaan_at, tanggal_antrian, surat_rujukan_path }) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 1) cari pasien_id dari akun_id
      const pasien = await RegistrationRepository.findPasienByAkunId(conn, akun_id);
      if (!pasien) return { ok: false, status: 404, message: "Pasien tidak ditemukan" };

      // 2) ambil no_antrian terakhir untuk tanggal ini (LOCK biar aman dari race condition)
      const lastNo = await RegistrationRepository.getLastQueueNumberForDate(conn, tanggal_antrian);
      const nextNo = (lastNo || 0) + 1;

      // 3) insert pendaftaran dulu (no_lab sementara null)
      const pendaftaranId = await RegistrationRepository.insertPendaftaran(conn, {
        pasien_id: pasien.id,
        no_antrian: nextNo,
        tanggal_antrian,
        jadwal_pemeriksaan_at,
        surat_rujukan_path,
        status: "MENUNGGU",
      });

      // 4) generate no_lab unik global
      const noLab = `LAB-${yyyymmdd(tanggal_antrian)}-${pad4(pendaftaranId)}`;
      await RegistrationRepository.updateNoLab(conn, pendaftaranId, noLab);

      await conn.commit();

      return {
        id: pendaftaranId,
        no_antrian: pad3(nextNo), // return string 001 dst
        no_lab: noLab,
        status: "MENUNGGU",
        surat_rujukan_path,
        tanggal_antrian,
        jadwal_pemeriksaan_at,
      };
    } catch (e) {
      await conn.rollback();
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

      const today = todayISO(); // YYYY-MM-DD
      const my = await RegistrationRepository.findMyQueueToday(conn, pasien.id, today);
      const stats = await RegistrationRepository.getQueueStats(conn, today);

      return { my, stats, tanggal: today };
    } finally {
      conn.release();
    }
  },
};
