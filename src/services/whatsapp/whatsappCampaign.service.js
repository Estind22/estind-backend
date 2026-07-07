// services/whatsapp/whatsappCampaign.service.js
import axios from "axios";

import WhatsAppCampaign from "../../models/whatsappCampaign.model.js";
import WhatsAppCampaignRecipient from "../../models/whatsappCampaignRecipient.model.js";
import WhatsAppIntegration from "../../models/whatsappIntegration.model.js";
import WhatsAppPhoneNumber from "../../models/whatsappPhoneNumber.model.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Check if the integration's messagesToday counter is stale (i.e. last reset
 * was on a different calendar day in IST) and reset it if so.
 * Returns the updated integration document.
 */
const ensureDailyCounterFresh = async (integration) => {
    const nowIST = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    const lastReset = integration.messagesTodayResetAt
        ? new Date(
            new Date(integration.messagesTodayResetAt).toLocaleString("en-US", {
                timeZone: "Asia/Kolkata"
            })
        )
        : null;

    const isStale =
        !lastReset ||
        lastReset.getFullYear() !== nowIST.getFullYear() ||
        lastReset.getMonth() !== nowIST.getMonth() ||
        lastReset.getDate() !== nowIST.getDate();

    if (isStale) {
        return await WhatsAppIntegration.findByIdAndUpdate(
            integration._id,
            {
                messagesToday: 0,
                messagesTodayResetAt: new Date()
            },
            { new: true }
        );
    }

    return integration;
};

/**
 * Resolve template variable values for a single recipient.
 * variableMappings: [{ key: "1", source: "recipient.name" | "recipient.phone" | "custom", customValue }]
 */
const resolveVariables = (variableMappings = [], recipient) => {
    return variableMappings.reduce((acc, mapping) => {
        let value = "";

        switch (mapping.source) {
            case "recipient.name":
                value = recipient.name || "";
                break;
            case "recipient.phone":
                value = recipient.phone || "";
                break;
            case "custom":
                value = mapping.customValue || "";
                break;
            default:
                value = "";
        }

        acc[mapping.key] = String(value);
        return acc;
    }, {});
};

/**
 * Build the Meta "components" array for a template message with resolved variables.
 */
const buildMetaComponents = (campaign, recipient) => {
    const { variableMappings = [], template = {} } = campaign;
    const { components: templateComponents = [] } = template;
    const metaComponents = [];

    // 1. Header Media
    const headerComp = templateComponents.find(c => c.type === "HEADER");
    if (headerComp && ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComp.format)) {
        // Try to find the handle in the example or the mediaUrl field
        const handle = headerComp.example?.header_handle?.[0] || template.mediaUrl;
        
        if (handle) {
            const type = headerComp.format.toLowerCase();
            const mediaParam = {};
            
            if (String(handle).startsWith("http")) {
                mediaParam.link = handle;
            } else {
                mediaParam.id = handle;
            }

            metaComponents.push({
                type: "header",
                parameters: [
                    {
                        type: type,
                        [type]: mediaParam
                    }
                ]
            });
        }
    }

    // 2. Body Variables
    // Only send body parameters if there are actually variable mappings defined
    if (variableMappings && Array.isArray(variableMappings) && variableMappings.length > 0) {
        const resolved = resolveVariables(variableMappings, recipient);
        
        const parameters = Object.entries(resolved)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([, value]) => ({
                type: "text",
                text: String(value)
            }));

        if (parameters.length > 0) {
            metaComponents.push({
                type: "body",
                parameters
            });
        }
    }

    return metaComponents;
};

/**
 * Send a single template message to one recipient via Meta Cloud API.
 * Returns wamid on success, throws on failure.
 */
const sendToRecipient = async ({ phoneNumberId, accessToken, to, template, components }) => {
    const payload = {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
            name: template.name,
            language: { code: template.language },
            components
        }
    };

    const resp = await axios.post(
        `https://graph.facebook.com/v24.0/${phoneNumberId}/messages`,
        payload,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            }
        }
    ).catch(err => {
        console.error("[Campaign Send Error] Payload:", JSON.stringify(payload, null, 2));
        console.error("[Campaign Send Error] Meta Response:", JSON.stringify(err.response?.data || err.message, null, 2));
        throw err;
    });

    return resp.data?.messages?.[0]?.id || null;
};

// ─── Main Executor ────────────────────────────────────────────────────────────

/**
 * Execute a campaign: loops through all pending recipients, sends template
 * messages via Meta API, enforces daily messaging limit, and updates statuses.
 *
 * This function is called:
 *   - Immediately after campaign creation (if scheduledAt is null)
 *   - By the scheduled campaign cron
 *   - By the manual re-trigger endpoint (for paused campaigns)
 *
 * It is intentionally non-blocking — callers fire-and-forget with .catch() logging.
 */
export const executeCampaign = async (campaignId) => {
    console.log(`[Campaign] Starting execution for campaignId: ${campaignId}`);

    // ── 1. Load campaign ──────────────────────────────────────────────────────
    const campaign = await WhatsAppCampaign.findById(campaignId);
    if (!campaign) {
        console.error(`[Campaign] Campaign not found: ${campaignId}`);
        return;
    }

    if (!["draft", "scheduled", "paused"].includes(campaign.status)) {
        console.warn(`[Campaign] Skipping campaign in status "${campaign.status}"`);
        return;
    }

    // ── 2. Load integration + phone number ────────────────────────────────────
    let integration = await WhatsAppIntegration.findOne({
        company: campaign.company,
        status: "CONNECTED"
    });

    if (!integration) {
        await WhatsAppCampaign.findByIdAndUpdate(campaignId, {
            status: "failed",
            completedAt: new Date()
        });
        console.error(`[Campaign] WhatsApp not connected for company: ${campaign.company}`);
        return;
    }

    const phoneDoc = await WhatsAppPhoneNumber.findOne({
        whatsappIntegration: integration._id
    }).lean();

    if (!phoneDoc?.phoneNumberId) {
        await WhatsAppCampaign.findByIdAndUpdate(campaignId, {
            status: "failed",
            completedAt: new Date()
        });
        console.error(`[Campaign] Phone number not found for integration: ${integration._id}`);
        return;
    }

    // ── 3. Ensure daily counter is fresh ──────────────────────────────────────
    integration = await ensureDailyCounterFresh(integration);

    // ── 4. Mark campaign as processing ───────────────────────────────────────
    await WhatsAppCampaign.findByIdAndUpdate(campaignId, {
        status: "processing",
        startedAt: campaign.startedAt || new Date()
    });

    // ── 5. Load pending recipients ────────────────────────────────────────────
    const recipients = await WhatsAppCampaignRecipient.find({
        campaign: campaignId,
        status: "pending"
    }).lean();

    console.log(`[Campaign] ${recipients.length} pending recipients to process`);

    let sentCount = 0;
    let failedCount = 0;
    let limitExceededCount = 0;
    let hitLimit = false;

    // ── 6. Loop through recipients ────────────────────────────────────────────
    for (const recipient of recipients) {
        // Re-read counter from DB to stay accurate across concurrent campaigns
        const freshIntegration = await WhatsAppIntegration.findById(integration._id)
            .select("messagesToday messagingLimit")
            .lean();

        const currentToday = freshIntegration?.messagesToday || 0;
        const limit = freshIntegration?.messagingLimit || 250;

        if (currentToday >= limit) {
            // Daily limit reached — mark remaining and pause
            await WhatsAppCampaignRecipient.findByIdAndUpdate(recipient._id, {
                status: "limit_exceeded"
            });
            limitExceededCount++;
            hitLimit = true;
            continue; // still mark all remaining, don't break early
        }

        // ── Build template components ─────────────────────────────────────────
        const components = buildMetaComponents(
            campaign,
            recipient
        );

        // ── Try sending with retry on rate-limit (error 130429) ───────────────
        let wamid = null;
        let sendError = null;
        let attempt = 0;
        const MAX_ATTEMPTS = 3;

        while (attempt < MAX_ATTEMPTS) {
            try {
                wamid = await sendToRecipient({
                    phoneNumberId: phoneDoc.phoneNumberId,
                    accessToken: integration.accessToken,
                    to: recipient.phone,
                    template: campaign.template,
                    components
                });
                sendError = null;
                break; // success
            } catch (err) {
                const metaErrorCode = err?.response?.data?.error?.code;

                if (metaErrorCode === 130429) {
                    // Throughput rate-limited — wait and retry
                    attempt++;
                    const waitMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                    console.warn(
                        `[Campaign] Rate limited (130429). Waiting ${waitMs}ms before retry ${attempt}/${MAX_ATTEMPTS}`
                    );
                    await sleep(waitMs);
                } else {
                    sendError =
                        err?.response?.data?.error?.message ||
                        err.message ||
                        "Unknown error";
                    break; // non-retriable error
                }
            }
        }

        // ── Update recipient status ───────────────────────────────────────────
        if (wamid) {
            await WhatsAppCampaignRecipient.findByIdAndUpdate(recipient._id, {
                status: "sent",
                metaMessageId: wamid,
                sentAt: new Date(),
                resolvedVariables: resolveVariables(campaign.variableMappings, recipient)
            });

            // Increment global daily counter atomically
            await WhatsAppIntegration.findByIdAndUpdate(integration._id, {
                $inc: { messagesToday: 1 }
            });

            sentCount++;
        } else {
            await WhatsAppCampaignRecipient.findByIdAndUpdate(recipient._id, {
                status: "failed",
                errorMessage: sendError || "Max retries exceeded"
            });
            failedCount++;
        }

        // ── Throttle: ~20 messages/sec (well under 80 mps default) ───────────
        await sleep(50);
    }

    // ── 7. Finalize campaign status ───────────────────────────────────────────
    const finalStatus = hitLimit ? "paused" : "completed";

    await WhatsAppCampaign.findByIdAndUpdate(campaignId, {
        status: finalStatus,
        completedAt: new Date(),
        $inc: {
            sentCount,
            failedCount,
            limitExceededCount
        }
    });

    console.log(
        `[Campaign] Done. Status: ${finalStatus} | Sent: ${sentCount} | Failed: ${failedCount} | LimitExceeded: ${limitExceededCount}`
    );
};

/**
 * Reset messagesToday = 0 for all WhatsApp integrations.
 * Called by the daily midnight cron.
 */
export const resetAllDailyCounters = async () => {
    const result = await WhatsAppIntegration.updateMany(
        {},
        {
            messagesToday: 0,
            messagesTodayResetAt: new Date()
        }
    );
    console.log(`[Campaign] Daily counters reset for ${result.nModified || result.modifiedCount} integrations`);
};
