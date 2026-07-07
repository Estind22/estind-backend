import EventAutomation from "../../models/eventAutomation.model.js";
import Lead from "../../models/lead.model.js";
import Visit from "../../models/visit.model.js";
import Meeting from "../../models/meeting.model.js";
import { sendInternalTemplateMessage } from "./whatsappSender.service.js";
import { normalizeWhatsAppNumber } from "../../utils/normalizePhone.js";
import { format } from "date-fns";

/**
 * Utility to extract a value from a nested object path (e.g. "lead.phoneNo")
 */
const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

const buildTemplateComponents = (automation, payload) => {
    const { variableMappings = [], template = {} } = automation;
    const { components: templateComponents = [] } = template;
    const metaComponents = [];

    // 1. Check for Media Header in template definition
    const headerComp = templateComponents.find(c => c.type === "HEADER");
    if (headerComp && ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComp.format)) {
        const handle = headerComp.example?.header_handle?.[0];
        if (handle) {
            const type = headerComp.format.toLowerCase();
            metaComponents.push({
                type: "header",
                parameters: [
                    {
                        type: type,
                        [type]: { link: handle }
                    }
                ]
            });
        }
    }

    // 2. Build Body Parameters
    if (variableMappings.length > 0) {
        const parameters = variableMappings.map((mapping) => {
            let value = "";

            if (mapping.source === "custom") {
                value = mapping.customValue || "";
            } else {
                const extractedValue = getNestedValue(payload, mapping.source);

                if ((mapping.source.includes("dateTime") || mapping.source.includes("scheduledAt")) && extractedValue) {
                    try {
                        const d = new Date(extractedValue);
                        if (!isNaN(d.getTime())) {
                            value = format(d, "dd MMM yyyy, hh:mm a");
                        } else {
                            value = String(extractedValue);
                        }
                    } catch (e) {
                        value = String(extractedValue);
                    }
                } else {
                    if (extractedValue && typeof extractedValue === 'object') {
                        value = extractedValue.name || String(extractedValue);
                    } else {
                        value = extractedValue !== undefined && extractedValue !== null ? String(extractedValue) : "";
                    }
                }
            }

            return {
                type: "text",
                text: String(value)
            };
        });

        metaComponents.push({
            type: "body",
            parameters
        });
    }

    return metaComponents;
};

/**
 * Map eventType to a human-readable source string for the message record.
 */
const eventTypeToSource = (eventType) => {
    const map = {
        VISIT_CREATED: "visit_created",
        VISIT_RESCHEDULED: "visit_rescheduled",
        VISIT_CANCELLED: "visit_cancelled",
        VISIT_COMPLETED: "visit_completed",
        VISIT_REMINDER_DAY_BEFORE: "visit_reminder",
        VISIT_REMINDER_MORNING: "visit_reminder",
        VISIT_REMINDER_1_HOUR: "visit_reminder",
        MEETING_CREATED: "meeting_created",
        MEETING_RESCHEDULED: "meeting_rescheduled",
        MEETING_CANCELLED: "meeting_cancelled",
        MEETING_COMPLETED: "meeting_completed",
        MEETING_REMINDER_30_MIN: "meeting_reminder",
        MEETING_REMINDER_15_MIN: "meeting_reminder",
        LEAD_STATUS_CHANGED: "status_trigger"
    };
    return map[eventType] || "event_automation";
};

/**
 * Triggers event-based WhatsApp automations.
 * 
 * @param {String} companyId 
 * @param {String} eventType e.g., 'VISIT_CREATED'
 * @param {Object} payload e.g., { lead, visit } documents
 */
/**
 * @returns {Promise<boolean>} true if at least one WhatsApp message was sent
 */
export const triggerEventAutomation = async (companyId, eventType, payload = {}, options = {}) => {
    try {
        if (!companyId || !eventType) return false;

        // Ensure we have a fully populated lead document
        let leadDoc = payload.lead;
        if (leadDoc && !leadDoc.phoneNo) {
            // It might just be an ID or a partially populated doc, let's fetch it fully
            const leadId = leadDoc._id || leadDoc;
            leadDoc = await Lead.findById(leadId).populate("service project property").lean();
            payload.lead = leadDoc;
        }

        // Ensure we have a fully populated visit document
        let visitDoc = payload.visit;
        if (visitDoc && (!visitDoc.dateTime || !visitDoc.status)) {
            const visitId = visitDoc._id || visitDoc;
            visitDoc = await Visit.findById(visitId).populate("project property").lean();
            payload.visit = visitDoc;
        }

        // Ensure we have a fully populated meeting document
        let meetingDoc = payload.meeting;
        if (meetingDoc) {
            const meetingId = meetingDoc._id || meetingDoc;
            if (!meetingDoc.scheduledAt || !meetingDoc.status) {
                meetingDoc = await Meeting.findById(meetingId).lean();
                payload.meeting = meetingDoc;
            }
        }

        if (!leadDoc || !leadDoc.phoneNo) return false;

        const normalizedPhone = normalizeWhatsAppNumber(leadDoc.phoneNo);
        if (!normalizedPhone) return false;

        const query = {
            company: companyId,
            isActive: true,
            eventType: eventType
        };

        if (options?.targetStatus) {
            query.targetStatus = options.targetStatus;
        }

        const automations = await EventAutomation.find(query).lean();

        if (!automations.length) return false;

        let sentCount = 0;

        for (const automation of automations) {
            try {
                const components = buildTemplateComponents(
                    automation,
                    payload
                );

                await sendInternalTemplateMessage({
                    companyId: companyId,
                    to: normalizedPhone,
                    template: {
                        name: automation.template.name,
                        language: automation.template.language,
                        components
                    },
                    fullTemplate: {
                        name: automation.template.name,
                        language: automation.template.language,
                        components: automation.template.components || []
                    },
                    source: eventTypeToSource(eventType)
                });

                sentCount += 1;
            } catch (err) {
                console.error(`[EventAutomation] Send failed for event ${eventType}:`, err.message);
            }
        }

        return sentCount > 0;
    } catch (err) {
        console.error(`[EventAutomation] triggerEventAutomation error:`, err.message);
        return false;
    }
};
