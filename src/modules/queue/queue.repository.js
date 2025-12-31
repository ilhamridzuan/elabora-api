export const QueueRepository = {
  async listToday(conn, tanggal) {
    const [rows] = await conn.query(
      `SELECT pd.id,
              pd.pasien_id,
              ps.nik,
              ps.nama,
              pd.no_antrian,
              pd.no_lab,
              pd.jadwal_pemeriksaan_at,
              pd.tanggal_antrian,
              pd.status,
              pd.surat_rujukan_path
       FROM pendaftaran pd
       JOIN pasien ps ON ps.id = pd.pasien_id
       WHERE pd.tanggal_antrian = ?
       ORDER BY pd.no_antrian ASC`,
      [tanggal]
    );
    return rows;
  },

  async getById(conn, id) {
    const [rows] = await conn.query(
      "SELECT id, status, tanggal_antrian, no_antrian FROM pendaftaran WHERE id=?",
      [id]
    );
    return rows[0] || null;
  },

  async updateStatus(conn, { id, status }) {
    await conn.query("UPDATE pendaftaran SET status=? WHERE id=?", [status, id]);
  },

  async findNextWaiting(conn, tanggal) {
    const [rows] = await conn.query(
      `SELECT id
       FROM pendaftaran
       WHERE tanggal_antrian = ? AND status = 'MENUNGGU'
       ORDER BY no_antrian ASC
       LIMIT 1`,
      [tanggal]
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

  async getDetailForNotify(conn, id) {
    const [rows] = await conn.query(
      `
    SELECT
      pd.id AS pendaftaran_id,
      pd.no_antrian,
      pd.tanggal_antrian,
      ps.nama AS pasien_nama,
      ps.akun_id AS akun_id
    FROM pendaftaran pd
    JOIN pasien ps ON ps.id = pd.pasien_id
    WHERE pd.id=?
    LIMIT 1
    `,
      [id]
    );
    return rows[0] || null;
  },
};
