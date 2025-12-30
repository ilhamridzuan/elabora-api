export const RegistrationRepository = {
  async findPasienByAkunId(conn, akun_id) {
    const [rows] = await conn.query(
      "SELECT id, akun_id, nik, nama FROM pasien WHERE akun_id=?",
      [akun_id]
    );
    return rows[0] || null;
  },

  async getLastQueueNumberForDate(conn, tanggal_antrian) {
    // penting: FOR UPDATE agar aman concurrency di transaksi
    const [rows] = await conn.query(
      "SELECT MAX(no_antrian) AS last_no FROM pendaftaran WHERE tanggal_antrian=? FOR UPDATE",
      [tanggal_antrian]
    );
    return rows[0]?.last_no ?? null;
  },

  async insertPendaftaran(conn, payload) {
    const [r] = await conn.query(
      `INSERT INTO pendaftaran
       (pasien_id, no_antrian, tanggal_antrian, jadwal_pemeriksaan_at, surat_rujukan_path,
        status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        payload.pasien_id,
        payload.no_antrian,
        payload.tanggal_antrian,
        payload.jadwal_pemeriksaan_at,
        payload.surat_rujukan_path,
        payload.status, // "MENUNGGU"
      ]
    );
    return r.insertId;
  },

  async updateNoLab(conn, id, no_lab) {
    await conn.query(
      "UPDATE pendaftaran SET no_lab=?, updated_at=NOW() WHERE id=?",
      [no_lab, id]
    );
  },

  async listByPasienId(conn, pasien_id, tanggal) {
    const params = [pasien_id];
    let sql = `
      SELECT id, no_lab, no_antrian, tanggal_antrian, jadwal_pemeriksaan_at,
             status, surat_rujukan_path, created_at
      FROM pendaftaran
      WHERE pasien_id=?`;

    if (tanggal) {
      sql += " AND tanggal_antrian=?";
      params.push(tanggal);
    }

    sql += " ORDER BY created_at DESC";
    const [rows] = await conn.query(sql, params);
    return rows;
  },

  async findMyQueueToday(conn, pasien_id, today) {
    const [rows] = await conn.query(
      `SELECT id, no_lab, no_antrian, status, jadwal_pemeriksaan_at
       FROM pendaftaran
       WHERE pasien_id=? AND tanggal_antrian=?
       ORDER BY created_at DESC
       LIMIT 1`,
      [pasien_id, today]
    );
    return rows[0] || null;
  },

  async getQueueStats(conn, today) {
    const [rows] = await conn.query(
      `SELECT
        COUNT(*) AS total,
        SUM(status='MENUNGGU') AS menunggu,
        SUM(status='DILAYANI') AS dilayani,
        SUM(status='SELESAI') AS selesai,
        SUM(status='DIBATALKAN') AS dibatalkan
       FROM pendaftaran
       WHERE tanggal_antrian=?`,
      [today]
    );
    return rows[0] || null;
  },
};
