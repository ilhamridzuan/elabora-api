export const PatientsRepository = {
  async list(conn, { search, limit, offset }) {
    const q = `%${search || ""}%`;

    const where = search
      ? "WHERE p.nama LIKE ? OR p.nik LIKE ?"
      : "";

    const params = search ? [q, q, limit, offset] : [limit, offset];

    const [rows] = await conn.query(
      `SELECT p.id, p.nik, p.nama, p.tgl_lahir, p.no_telepon,
              a.username, a.email
       FROM pasien p
       JOIN akun a ON a.id = p.akun_id
       ${where}
       ORDER BY p.nama ASC
       LIMIT ? OFFSET ?`,
      params
    );

    return rows;
  },

  async count(conn, { search }) {
    if (!search) {
      const [rows] = await conn.query("SELECT COUNT(*) AS total FROM pasien");
      return rows[0].total;
    }
    const q = `%${search}%`;
    const [rows] = await conn.query(
      "SELECT COUNT(*) AS total FROM pasien WHERE nama LIKE ? OR nik LIKE ?",
      [q, q]
    );
    return rows[0].total;
  },

  async findById(conn, patientId) {
    const [rows] = await conn.query(
      `SELECT p.*, a.username, a.email, a.role
       FROM pasien p
       JOIN akun a ON a.id = p.akun_id
       WHERE p.id=?`,
      [patientId]
    );
    return rows[0] || null;
  },
};
