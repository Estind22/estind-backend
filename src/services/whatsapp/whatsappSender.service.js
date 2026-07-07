import axios from "axios";
import mongoose from "mongoose";

import WhatsAppConversation from "../../models/whatsappConversation.model.js";
import WhatsAppMessage from "../../models/whatsappMessage.model.js";
import WhatsAppIntegration from "../../models/whatsappIntegration.model.js";
import WhatsAppPhoneNumber from "../../models/whatsappPhoneNumber.model.js";
import Lead from "../../models/lead.model.js";
import { getLast10Digits } from "../../utils/normalizePhone.js";

export const sendInternalTemplateMessage = async ({
    companyId,
    to,
    conversationId,
    template,
    sentBy = null,
    previewText = null,
    fullTemplate = null,
    source = "manual"
}) => {
    if (!companyId) throw new Error("companyId required");

    const integration = await WhatsAppIntegration.findOne({
        company: companyId,
        status: "CONNECTED"
    }).lean();

    if (!integration) throw new Error("WhatsApp not connected");

    const number = await WhatsAppPhoneNumber.findOne({
        whatsappIntegration: integration._id
    }).lean();

    if (!number?.phoneNumberId)
        throw new Error("WhatsApp phone number not found");

    const last10 = getLast10Digits(to);

    const leadDocs = last10
        ? await Lead.find({
            company: companyId,
            $or: [
                { phoneNo: last10 },
                { phoneNo: { $regex: `${last10}$` } }
            ]
        }).select("_id")
        : [];

    const leadIds = leadDocs.map((l) => l._id);

    let conversation = null;

    if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
        conversation = await WhatsAppConversation.findById(conversationId);
    }

    if (!conversation) {
        conversation = await WhatsAppConversation.findOneAndUpdate(
            { company: companyId, waId: to },
            {
                company: companyId,
                waId: to,
                phoneNumberId: number.phoneNumberId
            },
            { upsert: true, new: true }
        );
    }

    if (leadIds.length) {
        await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
            $addToSet: { leads: { $each: leadIds } }
        });
    }

    const safeTemplate = {
        name: template.name,
        language: { code: template.language },
        components: template.components || []
    };

    const metaPayload = {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: safeTemplate
    };

    // Always build templateMeta — the single source of truth stored in DB
    const resolvedTemplateMeta = fullTemplate
        ? {
            name: fullTemplate.name || template.name,
            language: fullTemplate.language || template.language,
            category: fullTemplate.category || null,
            status: fullTemplate.status || null,
            components: fullTemplate.components || [],
            previewText: previewText || null
        }
        : {
            name: template.name,
            language: template.language,
            category: null,
            status: null,
            components: template.components || [],
            previewText: null
        };

    // 1. Resolve variables in template text for DB storage
    let resolvedText = previewText || "";
    if (fullTemplate) {
        const bodyCompDef = fullTemplate.components?.find(c => c.type === "BODY");
        const bodyCompVals = template.components?.find(c => c.type === "body");

        if (bodyCompDef?.text) {
            resolvedText = bodyCompDef.text;
            const params = bodyCompVals?.parameters || [];
            params.forEach((param, idx) => {
                const placeholder = `{{${idx + 1}}}`;
                const val = param.text || param.payload || placeholder;
                resolvedText = resolvedText.replaceAll(placeholder, val);
            });
        }
    }

    const displayBody = resolvedText || `[TEMPLATE] ${template.name}`;

    const outboundMsg = await WhatsAppMessage.create({
        company: companyId,
        conversation: conversation._id,
        direction: "OUTBOUND",
        type: "template",
        body: displayBody,
        status: "pending",
        timestamp: new Date(),
        sentBy,
        source,
        templateMeta: {
            ...resolvedTemplateMeta,
            previewText: displayBody
        }
    });

    await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
        lastMessage: displayBody,
        lastMessageAt: new Date()
    });

    let metaResp;

    try {
        metaResp = await axios.post(
            `https://graph.facebook.com/v24.0/${number.phoneNumberId}/messages`,
            metaPayload,
            {
                headers: {
                    Authorization: `Bearer ${integration.accessToken}`,
                    "Content-Type": "application/json"
                }
            }
        );
    } catch (err) {
        outboundMsg.status = "failed";
        outboundMsg.errorMessage =
            err?.response?.data?.error?.message || err.message;

        await outboundMsg.save();
        throw err;
    }

    const metaMessageId = metaResp?.data?.messages?.[0]?.id;

    if (!metaMessageId) {
        outboundMsg.status = "failed";
        await outboundMsg.save();
        throw new Error("Meta send failed");
    }

    outboundMsg.messageId = metaMessageId;
    outboundMsg.status = "sent";
    await outboundMsg.save();

    return {
        message: outboundMsg,
        conversationId: conversation._id
    };
};

export const sendInternalTextMessage = async ({
    companyId,
    to,
    conversationId,
    message,
    sentBy = null,
    source = "manual"
}) => {
    if (!companyId) throw new Error("companyId required");

    const integration = await WhatsAppIntegration.findOne({
        company: companyId,
        status: "CONNECTED"
    }).lean();

    if (!integration) throw new Error("WhatsApp not connected");

    const number = await WhatsAppPhoneNumber.findOne({
        whatsappIntegration: integration._id
    }).lean();

    if (!number?.phoneNumberId)
        throw new Error("WhatsApp phone number not found");

    const last10 = getLast10Digits(to);

    const leadDocs = last10
        ? await Lead.find({
            company: companyId,
            $or: [
                { phoneNo: last10 },
                { phoneNo: { $regex: `${last10}$` } }
            ]
        }).select("_id")
        : [];

    const leadIds = leadDocs.map((l) => l._id);

    let conversation = null;

    if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
        conversation = await WhatsAppConversation.findById(conversationId);
    }

    if (!conversation) {
        conversation = await WhatsAppConversation.findOneAndUpdate(
            { company: companyId, waId: to },
            {
                company: companyId,
                waId: to,
                phoneNumberId: number.phoneNumberId
            },
            { upsert: true, new: true }
        );
    }

    const metaPayload = {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message }
    };

    const outboundMsg = await WhatsAppMessage.create({
        company: companyId,
        conversation: conversation._id,
        direction: "OUTBOUND",
        type: "text",
        body: message,
        status: "pending",
        timestamp: new Date(),
        sentBy,
        source
    });

    await WhatsAppConversation.findByIdAndUpdate(conversation._id, {
        lastMessage: message,
        lastMessageAt: new Date()
    });

    let metaResp;

    try {
        metaResp = await axios.post(
            `https://graph.facebook.com/v24.0/${number.phoneNumberId}/messages`,
            metaPayload,
            {
                headers: {
                    Authorization: `Bearer ${integration.accessToken}`,
                    "Content-Type": "application/json"
                }
            }
        );
    } catch (err) {
        outboundMsg.status = "failed";
        outboundMsg.errorMessage =
            err?.response?.data?.error?.message || err.message;

        await outboundMsg.save();
        throw err;
    }

    const metaMessageId = metaResp?.data?.messages?.[0]?.id;

    if (!metaMessageId) {
        outboundMsg.status = "failed";
        await outboundMsg.save();
        throw new Error("Meta send failed");
    }

    outboundMsg.messageId = metaMessageId;
    outboundMsg.status = "sent";
    await outboundMsg.save();

    return {
        message: outboundMsg,
        conversationId: conversation._id
    };
};
