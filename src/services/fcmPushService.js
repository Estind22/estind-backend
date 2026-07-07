// src/services/fcmPushService.js
import admin from "../config/firebase.js";
import Session from "../models/session.model.js";

/**
 * Send a Firebase FCM push notification to a user's mobile/tablet devices.
 *
 * @param {string|ObjectId} userId    - The user to notify
 * @param {string|ObjectId} companyId - (Deprecated/Ignored) The company the user belongs to
 * @param {string} title              - Notification title
 * @param {string} body               - Notification body
 * @param {Object} [extraData={}]     - Additional key-value data (all values must be strings)
 */
export async function sendFcmPush(userId, companyId, title, body, extraData = {}) {
  try {
    const subs = await Session.find({
      userId,
      active: true,
      deviceType: { $in: ["mobile", "tablet", "app"] },
      "subscription.fcm_token": { $exists: true, $ne: "" }
    }).lean();

    const tokens = subs.map((s) => s.subscription?.fcm_token).filter(Boolean);
    if (!tokens.length) return;

    const payload = {
      data: {
        ...extraData,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      android: {
        priority: "high",
        notification: { sound: "default" },
      },
      apns: {
        payload: { aps: { sound: "default" } },
      },
      tokens,
    };

    if (extraData && extraData?.type != 'whatsapp_incoming') {
      payload.notification = { title, body };
    }

    const response = await admin.messaging().sendEachForMulticast(payload);

    // Clean up invalid/expired tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((r, idx) => {
        if (!r.success) {
          const errCode = r.error?.code || "";
          if (
            errCode.includes("registration-token-not-registered") ||
            errCode.includes("invalid-registration-token")
          ) {
            failedTokens.push(tokens[idx]);
          }
        }
      });

      if (failedTokens.length) {
        await Session.deleteMany({
          "subscription.fcm_token": { $in: failedTokens },
        });
      }
    }
  } catch (err) {
    console.error("[FCM] Push error:", err?.message || err);
  }
}
