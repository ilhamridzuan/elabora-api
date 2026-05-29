export const AuthRepository = {
  async getNextAkunId(conn) {
    const [rows] = await conn.query(
      "SELECT MAX(id) AS max_id FROM akun FOR UPDATE"
    );
    const maxId = rows[0]?.max_id ?? 0;
    return maxId + 1;
  },

  async getNextPasienId(conn) {
    const [rows] = await conn.query(
      "SELECT MAX(id) AS max_id FROM pasien FOR UPDATE"
    );
    const maxId = rows[0]?.max_id ?? 0;
    return maxId + 1;
  },

  async getNextDokterId(conn) {
    const [rows] = await conn.query(
      "SELECT MAX(id) AS max_id FROM dokter FOR UPDATE"
    );
    const maxId = rows[0]?.max_id ?? 0;
    return maxId + 1;
  },

  async getNextPetugasLabId(conn) {
    const [rows] = await conn.query(
      "SELECT MAX(id) AS max_id FROM petugas_lab FOR UPDATE"
    );
    const maxId = rows[0]?.max_id ?? 0;
    return maxId + 1;
  },

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
    const nextId = await this.getNextAkunId(conn);
    const [res] = await conn.query(
      `INSERT INTO akun (id, username, email, password_hash, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'PASIEN', NOW(), NOW())`,
      [nextId, data.username, data.email, data.password_hash]
    );
    return nextId;
  },

  async insertPasien(conn, data) {
    const nextId = await this.getNextPasienId(conn);
    await conn.query(
      `INSERT INTO pasien (id, akun_id, nik, nama, tgl_lahir, jenis_kelamin, alamat, no_telepon, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        nextId,
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
    const nextId = await this.getNextAkunId(conn);
    const [res] = await conn.query(
      `INSERT INTO akun (id, username, email, password_hash, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'DOKTER', NOW(), NOW())`,
      [nextId, data.username, data.email, data.password_hash]
    );
    return nextId;
  },

  async insertAkunPetugas(conn, data) {
    const nextId = await this.getNextAkunId(conn);
    const [res] = await conn.query(
      `INSERT INTO akun (id, username, email, password_hash, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'PETUGAS', NOW(), NOW())`,
      [nextId, data.username, data.email, data.password_hash]
    );
    return nextId;
  },

  async insertDokter(conn, data) {
    const nextId = await this.getNextDokterId(conn);
    await conn.query(
      `INSERT INTO dokter (id, akun_id, nip, nama, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [
        nextId,
        data.akun_id,
        data.nip,
        data.nama,
      ]
    );
  },

  async insertPetugas(conn, data) {
    const nextId = await this.getNextPetugasLabId(conn);
    await conn.query(
      `INSERT INTO petugas_lab (id, akun_id, nip, nama, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [
        nextId,
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

  async checkUsernameExists(conn, username) {
    const [rows] = await conn.query(
      "SELECT COUNT(*) as count FROM akun WHERE username = ?",
      [username]
    );
    return rows[0].count > 0;
  },

  async checkEmailExists(conn, email) {
    const [rows] = await conn.query(
      "SELECT COUNT(*) as count FROM akun WHERE email = ?",
      [email]
    );
    return rows[0].count > 0;
  },

  async checkUsernameOrEmailExists(conn, username, email) {
    const [rows] = await conn.query(
      "SELECT COUNT(*) as count FROM akun WHERE username = ? OR email = ?",
      [username, email]
    );
    return rows[0].count > 0;
  },
};
