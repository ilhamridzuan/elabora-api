import { AuditService } from './audit.service.js';

export const AuditController = {
  async index(req, res, next) {
    try {
      const { entity, limit, page } = req.query;

      const result = await AuditService.list({
        entity,
        limit,
        page,
      });

      return res.json(result);
    } catch (err) {
      next(err);
    }
  },
};
