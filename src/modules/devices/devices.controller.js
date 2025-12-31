import { DevicesService } from "./devices.service.js";

export const DevicesController = {
  async upsertToken(req, res, next) {
    try {
      const { fcm_token, platform } = req.body || {};
      if (!fcm_token) return res.status(400).json({ message: "fcm_token wajib" });

      const result = await DevicesService.upsertToken({
        akun_id: req.user.akun_id,
        fcm_token,
        platform: platform || "ANDROID",
      });

      return res.json(result);
    } catch (e) {
      next(e);
    }
  },
};
