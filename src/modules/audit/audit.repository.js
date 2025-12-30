export const AuditRepository = {
  /**
   * detail will be stored as JSON in audit_log.detail
   */
  async insert(conn, { entity, entity_id, aksi, changed_by_akun_id, detail }) {
    await conn.query(
      `INSERT INTO audit_log (entity, entity_id, aksi, changed_by_akun_id, changed_at, detail)
       VALUES (?, ?, ?, ?, NOW(), ?)`
      , [
        entity,
        entity_id,
        aksi,
        changed_by_akun_id ?? null,
        detail ? JSON.stringify(detail) : null,
      ]
    );
  },

  async list(conn, { entity, limit = 20, offset = 0 }) {
    let whereClause = '';
    const bindings = [];

    if (entity) {
      whereClause = 'WHERE a.entity = ?';
      bindings.push(entity);
    }

    const [rows] = await conn.query(
      `
      SELECT
        a.entity,
        a.changed_at,
        a.detail,
        ak.username AS changed_by
      FROM audit_log a
      LEFT JOIN akun ak ON ak.id = a.changed_by_akun_id
      ${whereClause}
      ORDER BY a.changed_at DESC
      LIMIT ? OFFSET ?
      `,
      [...bindings, Number(limit), Number(offset)]
    );

    return rows;
  },
};
