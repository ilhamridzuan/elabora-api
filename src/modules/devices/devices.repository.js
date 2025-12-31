export const DevicesRepository = {
  async upsert(conn, { akun_id, fcm_token, platform = "ANDROID" }) {
    await conn.query(
      `
      INSERT INTO device_tokens (akun_id, fcm_token, platform, updated_at)
      VALUES (?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        akun_id = VALUES(akun_id),
        platform = VALUES(platform),
        updated_at = NOW()
      `,
      [akun_id, fcm_token, platform]
    );
  },
};
