export const DevicesRepository = {
  async getNextDeviceTokenId(conn) {
    const [rows] = await conn.query(
      "SELECT MAX(id) AS max_id FROM device_tokens FOR UPDATE"
    );
    const maxId = rows[0]?.max_id ?? 0;
    return maxId + 1;
  },

  async upsert(conn, { akun_id, fcm_token, platform = "ANDROID" }) {
    const nextId = await this.getNextDeviceTokenId(conn);
    await conn.query(
      `
      INSERT INTO device_tokens (id, akun_id, fcm_token, platform, updated_at)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        akun_id = VALUES(akun_id),
        platform = VALUES(platform),
        updated_at = NOW()
      `,
      [nextId, akun_id, fcm_token, platform]
    );
  },
};
