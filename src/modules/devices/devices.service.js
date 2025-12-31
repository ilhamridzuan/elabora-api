import { db } from "../config/db.js";
import { DevicesRepository } from "./devices.repository.js";

export const DevicesService = {
  async upsertToken({ akun_id, fcm_token, platform }) {
    const conn = await db.getConnection();
    try {
      await DevicesRepository.upsert(conn, { akun_id, fcm_token, platform });
      return { ok: true };
    } finally {
      conn.release();
    }
  },
};
