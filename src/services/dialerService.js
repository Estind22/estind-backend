import admin from "../config/firebase.js";

export async function sendFCMDataMessage(fcmToken, data) {
  const message = {
    token: fcmToken,
    android: {
      priority: "high",
    },
    data,
  };

  return admin.messaging().send(message);
}
