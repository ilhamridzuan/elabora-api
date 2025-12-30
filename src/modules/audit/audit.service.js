import { db } from '../../config/db.js';
import { AuditRepository } from './audit.repository.js';

export const AuditService = {
  async list({ entity, limit, page }) {
    // default & max limit
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    const conn = await db.getConnection();
    try {
      const rows = await AuditRepository.list(conn, {
        entity,
        limit: safeLimit,
        offset,
      });

      return {
        data: rows,
        meta: {
          page: safePage,
          limit: safeLimit,
          hasNext: rows.length === safeLimit,
          hasPrev: safePage > 1,
        },
      };
    } finally {
      conn.release();
    }
  },
};
