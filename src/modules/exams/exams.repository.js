export const ExamsRepository = {
  async listByPatient(conn, { pasien_id }) {
    const [rows] = await conn.query(
      `SELECT pe.id AS pemeriksaan_id,
              pe.tgl_pemeriksaan,
              pe.status_validasi,
              pe.status_hasil,
              pe.catatan,
              k.id AS kategori_id,
              k.nama AS kategori_nama,
              p.id AS pendaftaran_id,
              p.no_antrian,
              p.no_lab,
              p.jadwal_pemeriksaan_at,
              p.status AS status_antrian
       FROM pendaftaran p
       JOIN pemeriksaan pe ON pe.pendaftaran_id = p.id
       JOIN kategori k ON k.id = pe.kategori_id
       WHERE p.pasien_id = ?
       ORDER BY pe.tgl_pemeriksaan DESC, pe.id DESC`,
      [pasien_id]
    );
    return rows;
  },

  async findPetugasLabIdByAkunId(conn, akunId) {
    const [rows] = await conn.query(
      `SELECT id FROM petugas_lab WHERE akun_id = ? LIMIT 1`,
      [akunId]
    );
    return rows[0] || null;
  },

  async getDetail(conn, pemeriksaanId) {
    const [rows] = await conn.query(
      `SELECT pe.*, k.nama AS kategori_nama,
              p.no_lab, p.no_antrian, p.tanggal_antrian, p.status AS status_antrian,
              ps.id AS pasien_id, ps.nik, ps.nama AS pasien_nama
       FROM pemeriksaan pe
       JOIN kategori k ON k.id = pe.kategori_id
       JOIN pendaftaran p ON p.id = pe.pendaftaran_id
       JOIN pasien ps ON ps.id = p.pasien_id
       WHERE pe.id=?`,
      [pemeriksaanId]
    );
    return rows[0] || null;
  },

  async create(conn, payload) {
    const [result] = await conn.query(
      `INSERT INTO pemeriksaan (pendaftaran_id, kategori_id, dokter_id, petugas_lab_id, tgl_pemeriksaan, status_validasi, status_hasil, catatan, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        payload.pendaftaran_id,
        payload.kategori_id,
        payload.dokter_id ?? null,
        payload.petugas_lab_id,
        payload.tgl_pemeriksaan ?? new Date(),
        payload.status_validasi ?? "DRAFT",
        payload.status_hasil ?? "MENUNGGU_HASIL",
        payload.catatan ?? null,
      ]
    );
    return result.insertId;
  },

  async update(conn, id, patch) {
    const fields = [];
    const vals = [];

    for (const [k, v] of Object.entries(patch)) {
      fields.push(`${k}=?`);
      vals.push(v);
    }
    if (fields.length === 0) return;
    vals.push(id);

    await conn.query(
      `UPDATE pemeriksaan SET ${fields.join(", ")}, updated_at=NOW() WHERE id=?`,
      vals
    );
  },

  async insertFile(conn, { pemeriksaan_id, file_path, mime_type }) {
    const [result] = await conn.query(
      `INSERT INTO pemeriksaan_file (pemeriksaan_id, file_path, file_type, uploaded_at)
       VALUES (?, ?, ?, NOW())`,
      [pemeriksaan_id, file_path, mime_type]
    );
    return result.insertId;
  },

  async listFiles(conn, pemeriksaanId) {
    const [rows] = await conn.query(
      `SELECT id, file_path, file_type, uploaded_at
       FROM pemeriksaan_file
       WHERE pemeriksaan_id=?
       ORDER BY id DESC`,
      [pemeriksaanId]
    );
    return rows;
  },

  async listAll(conn, { q, status_hasil, limit, offset }) {
    const bindings = [];
    const where = [];

    // Filter status_hasil
    if (status_hasil) {
      where.push(`pe.status_hasil = ?`);
      bindings.push(status_hasil);
    }

    /**
     * Search q:
     * - angka -> pasien_id / pendaftaran_id / pemeriksaan_id
     * - teks  -> nik / nama pasien
     */
    if (q) {
      const qStr = String(q).trim();
      const isNumeric = /^[0-9]+$/.test(qStr);

      if (isNumeric) {
        where.push(`(
          p.pasien_id = ? OR
          p.id = ? OR
          pe.id = ?
        )`);
        bindings.push(Number(qStr), Number(qStr), Number(qStr));
      } else {
        where.push(`(
          ps.nik LIKE ? OR
          ps.nama LIKE ?
        )`);
        bindings.push(`%${qStr}%`, `%${qStr}%`);
      }
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // limit + 1 untuk cek hasNext
    const limitPlus = Number(limit) + 1;

    const [rows] = await conn.query(
      `
      SELECT
        pe.id AS pemeriksaan_id,
        pe.tgl_pemeriksaan,
        pe.status_validasi,
        pe.status_hasil,
        pe.catatan,

        k.id AS kategori_id,
        k.nama AS kategori_nama,

        p.id AS pendaftaran_id,
        p.pasien_id,

        ps.nik,
        ps.nama AS pasien_nama
      FROM pendaftaran p
      JOIN pemeriksaan pe ON pe.pendaftaran_id = p.id
      JOIN kategori k ON k.id = pe.kategori_id
      JOIN pasien ps ON ps.id = p.pasien_id
      ${whereClause}
      ORDER BY pe.tgl_pemeriksaan DESC, pe.id DESC
      LIMIT ? OFFSET ?
      `,
      [...bindings, limitPlus, Number(offset)]
    );

    return rows;
  },
};
