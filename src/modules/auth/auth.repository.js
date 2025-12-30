export const AuthRepository = {
  async findByUsername(conn, username) {
    const [rows] = await conn.query(
      "SELECT * FROM akun WHERE username = ? LIMIT 1",
      [username]
    );
    return rows[0];
  },

  async findAkunById(conn, akunId) {
    const [rows] = await conn.query(
      "SELECT id, username, email, role FROM akun WHERE id = ?",
      [akunId]
    );
    return rows[0];
  },

  async insertAkun(conn, data) {
    const [res] = await conn.query(
      `INSERT INTO akun (username, email, password_hash, role, created_at, updated_at)
       VALUES (?, ?, ?, 'PASIEN', NOW(), NOW())`,
      [data.username, data.email, data.password_hash]
    );
    return res.insertId;
  },

  async insertPasien(conn, data) {
    await conn.query(
      `INSERT INTO pasien (akun_id, nik, nama, tgl_lahir, jenis_kelamin, alamat, no_telepon, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        data.akun_id,
        data.nik,
        data.nama,
        data.tgl_lahir,
        data.jenis_kelamin,
        data.alamat,
        data.no_telepon,
      ]
    );
  },

  async insertAkunDokter(conn, data) {
    const [res] = await conn.query(
      `INSERT INTO akun (username, email, password_hash, role, created_at, updated_at)
       VALUES (?, ?, ?, 'DOKTER', NOW(), NOW())`,
      [data.username, data.email, data.password_hash]
    );
    return res.insertId;
  },

  async insertAkunPetugas(conn, data) {
    const [res] = await conn.query(
      `INSERT INTO akun (username, email, password_hash, role, created_at, updated_at)
       VALUES (?, ?, ?, 'PETUGAS', NOW(), NOW())`,
      [data.username, data.email, data.password_hash]
    );
    return res.insertId;
  },

  async insertDokter(conn, data) {
    await conn.query(
      `INSERT INTO dokter (akun_id, nip, nama, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [
        data.akun_id,
        data.nip,
        data.nama,
      ]
    );
  },

  async insertPetugas(conn, data) {
    await conn.query(
      `INSERT INTO petugas_lab (akun_id, nip, nama, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [
        data.akun_id,
        data.nip,
        data.nama,
      ]
    );
  },

  async findProfileByRole(conn, akunId, role) {
    let sql = "";
    if (role === "PASIEN") {
      sql = `SELECT * FROM pasien WHERE akun_id = ?`;
    } else if (role === "DOKTER") {
      sql = `SELECT * FROM dokter WHERE akun_id = ?`;
    } else if (role === "PETUGAS") {
      sql = `SELECT * FROM petugas_lab WHERE akun_id = ?`;
    }

    const [rows] = await conn.query(sql, [akunId]);
    return rows[0] || null;
  },
};
