import cron from "node-cron";
import Session from "../models/session.model.js";
import { sendFCMDataMessage } from "../services/dialerService.js";

/**
 * Keep-alive cron job
 * Runs every 1 minute to broadcast a silent notification to all active apps.
 * This helps keep the app alive in the background, especially during long calls (1.5 min+)
 * where the OS might otherwise kill the background process.
 */
cron.schedule("* * * * *", async () => {
    try {
        // console.log("⏰ [CRON] Keep-alive broadcast check started");

        // Find all active app sessions that have an FCM token
        const activeAppSubs = await Session.find({
            deviceType: "app",
            active: true,
            "subscription.fcm_token": { $exists: true, $ne: "" }
        }).lean();

        if (activeAppSubs.length === 0) {
            // console.log("ℹ️ [CRON] No active app subscriptions found for keep-alive.");
            return;
        }

        const data = {
            type: "KEEP_ALIVE",
            timestamp: new Date().toISOString()
        };

        // console.log(`📡 [CRON] Broadcasting keep-alive to ${activeAppSubs.length} devices...`);

        // Send silent notifications in parallel
        const results = await Promise.allSettled(
            activeAppSubs.map(sub =>
                sendFCMDataMessage(sub.subscription.fcm_token, data)
            )
        );

        // console.log(results);

        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const failCount = results.length - successCount;

        // console.log(`✅ [CRON] Keep-alive broadcast finished. Success: ${successCount}, Failed: ${failCount}`);

    } catch (error) {
        console.error("❌ [CRON] Keep-alive job error:", error);
    }
});
