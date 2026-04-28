export const PatientsRepository = {
  buildWhereClause(filters) {
    const whereClauses = [];
    const params = [];

    if (filters.name) {
      whereClauses.push('p.nama LIKE ?');
      params.push(`%${filters.name}%`);
    }

    if (filters.nik) {
      whereClauses.push('p.nik LIKE ?');
      params.push(`${filters.nik}%`);
    }

    if (filters.phone) {
      whereClauses.push('p.no_telepon LIKE ?');
      params.push(`${filters.phone}%`);
    }

    if (filters.dobStart) {
      whereClauses.push('p.tgl_lahir >= ?');
      params.push(filters.dobStart);
    }

    if (filters.dobEnd) {
      whereClauses.push('p.tgl_lahir <= ?');
      params.push(filters.dobEnd);
    }

    if (filters.regStart) {
      whereClauses.push('p.created_at >= ?');
      params.push(filters.regStart);
    }

    if (filters.regEnd) {
      whereClauses.push('p.created_at <= ?');
      params.push(filters.regEnd);
    }

    return { whereClauses, params };
  },

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

  async advancedList(conn, filters) {
    const { whereClauses, params } = this.buildWhereClause(filters);
    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    const sortBy = filters.sortBy || 'nama';
    const sortOrder = filters.sortOrder || 'ASC';
    
    params.push(filters.limit, filters.offset);
    
    const sql = `
      SELECT p.id, p.nik, p.nama, p.tgl_lahir, p.no_telepon,
             a.username, a.email
      FROM pasien p
      JOIN akun a ON a.id = p.akun_id
      ${whereSQL}
      ORDER BY p.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;
    
    const [rows] = await conn.query(sql, params);
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

  async advancedCount(conn, filters) {
    const { whereClauses, params } = this.buildWhereClause(filters);
    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
    const sql = `SELECT COUNT(*) AS total FROM pasien p ${whereSQL}`;
    const [rows] = await conn.query(sql, params);
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
