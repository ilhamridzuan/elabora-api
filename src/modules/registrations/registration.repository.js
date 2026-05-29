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

  async getNextPendaftaranId(conn) {
    // penting: FOR UPDATE agar aman concurrency di transaksi
    const [rows] = await conn.query(
      "SELECT MAX(id) AS max_id FROM pendaftaran FOR UPDATE"
    );
    const maxId = rows[0]?.max_id ?? 0;
    return maxId + 1;
  },

  async insertPendaftaran(conn, payload) {
    const [r] = await conn.query(
      `INSERT INTO pendaftaran
       (id, pasien_id, no_antrian, no_lab, tanggal_antrian, jadwal_pemeriksaan_at,
        status,
        surat_rujukan_blob_name, surat_rujukan_container, surat_rujukan_content_type,
        surat_rujukan_size_bytes, surat_rujukan_sha256,
        created_at, updated_at)
       VALUES (?, ?, ?, 'DEFAULT', ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        payload.id,
        payload.pasien_id,
        payload.no_antrian,
        payload.tanggal_antrian,
        payload.jadwal_pemeriksaan_at,
        payload.status,
        payload.surat_rujukan_blob_name ?? null,
        payload.surat_rujukan_container ?? null,
        payload.surat_rujukan_content_type ?? null,
        payload.surat_rujukan_size_bytes ?? null,
        payload.surat_rujukan_sha256 ?? null,
      ]
    );
    return r.insertId;
  },

  async findById(conn, id) {
    const [rows] = await conn.query(
      `SELECT id, pasien_id, no_lab, no_antrian, tanggal_antrian, jadwal_pemeriksaan_at,
              status, surat_rujukan_blob_name, surat_rujukan_container,
              surat_rujukan_content_type, surat_rujukan_size_bytes, surat_rujukan_sha256
       FROM pendaftaran
       WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
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

  async listByPatientIdWithPagination(conn, { pasien_id, status, limit, offset }) {
    const params = [pasien_id];
    let sql = `
      SELECT 
        p.id,
        p.pasien_id,
        p.no_antrian,
        p.no_lab,
        p.status,
        p.tanggal_antrian,
        p.jadwal_pemeriksaan_at,
        p.surat_rujukan_blob_name AS file_path,
        p.created_at
      FROM pendaftaran p
      WHERE p.pasien_id = ?`;

    if (status) {
      sql += " AND p.status = ?";
      params.push(status);
    }

    sql += " ORDER BY p.tanggal_antrian DESC, p.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [rows] = await conn.query(sql, params);
    return rows;
  },

  async countByPatientId(conn, { pasien_id, status }) {
    const params = [pasien_id];
    let sql = "SELECT COUNT(*) AS total FROM pendaftaran WHERE pasien_id = ?";

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }

    const [rows] = await conn.query(sql, params);
    return rows[0]?.total || 0;
  },
};
