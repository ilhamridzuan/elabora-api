import admin from "firebase-admin";
import { db } from "../config/db.js";

function initFirebaseAdmin() {
  if (admin.apps.length) return;

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64) {
    console.warn("[FCM] FIREBASE_SERVICE_ACCOUNT_B64 not set; push disabled.");
    return;
  }

  const jsonStr = Buffer.from(b64, "base64").toString("utf8");
  const serviceAccount = JSON.parse(jsonStr);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("[FCM] firebase-admin initialized");
}

initFirebaseAdmin();

async function listTokensByAkunId(conn, akun_id) {
  const [rows] = await conn.query(
    `SELECT fcm_token FROM device_tokens WHERE akun_id=?`,
    [akun_id]
  );
  return rows.map(r => r.fcm_token);
}

async function deleteToken(conn, token) {
  await conn.query(`DELETE FROM device_tokens WHERE fcm_token=?`, [token]);
}

export const FcmService = {
  async notifyAkun({ akun_id, title, body, data = {} }) {
    if (!admin.apps.length) return { ok: false, skipped: true, reason: "FCM not initialized" };

    const conn = await db.getConnection();
    try {
      const tokens = await listTokensByAkunId(conn, akun_id);
      if (!tokens.length) return { ok: true, sent: 0 };

      const message = {
        notification: { title, body },
        data: Object.fromEntries(Object.entries(data).map(([k, v]) => [String(k), String(v)])),
        android: {
          priority: "high",
          notification: { channelId: process.env.FCM_ANDROID_CHANNEL_ID || "antrian" },
        },
        tokens,
      };

      const resp = await admin.messaging().sendEachForMulticast(message);

      // cleanup invalid tokens
      const invalid = new Set([
        "messaging/invalid-registration-token",
        "messaging/registration-token-not-registered",
      ]);

      for (let i = 0; i < resp.responses.length; i++) {
        const r = resp.responses[i];
        if (!r.success && r.error?.code && invalid.has(r.error.code)) {
          await deleteToken(conn, tokens[i]);
        }
      }

      return { ok: true, sent: resp.successCount, failed: resp.failureCount };
    } finally {
      conn.release();
    }
  },
};
