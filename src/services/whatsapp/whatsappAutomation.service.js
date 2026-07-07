import WhatsAppAutomation from "../../models/whatsappAutomation.model.js";
import { sendInternalTemplateMessage } from "./whatsappSender.service.js";
import { normalizeWhatsAppNumber } from "../../utils/normalizePhone.js";

const buildTemplateComponents = (automation = {}, lead) => {
    const { template = {}, variableMappings = [] } = automation;
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

            switch (mapping.source) {
                case "lead.name":
                    value = lead.name || "";
                    break;
                case "lead.phoneNo":
                    value = lead.phoneNo || "";
                    break;
                case "lead.email":
                    value = lead.email || "";
                    break;
                case "lead.source":
                    value = lead.source || "";
                    break;
                case "lead.service":
                    value = lead.service?.name || "";
                    break;
                case "custom":
                    value = mapping.customValue || "";
                    break;
                default:
                    value = "";
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

export const runLeadWhatsAppAutomations = async (lead) => {
    try {
        if (!lead?.phoneNo) return;

        const normalizedPhone = normalizeWhatsAppNumber(lead.phoneNo);
        if (!normalizedPhone) return;

        const automations = await WhatsAppAutomation.find({
            company: lead.company,
            isActive: true,
            leadSources: lead.source
        }).lean();

        if (!automations.length) return;

        for (const automation of automations) {
            try {
                // Determine the effective automation (either default or form-specific override)
                let effectiveAutomation = automation;

                if (lead.source === "Meta Ads" && lead.meta?.metaFormId) {
                    const activeOverride = automation.formOverrides?.find(
                        ov => ov.formId === lead.meta.metaFormId && ov.isActive
                    );

                    if (activeOverride) {
                        effectiveAutomation = {
                            ...automation,
                            template: activeOverride.template,
                            variableMappings: activeOverride.variableMappings
                        };
                    }
                } else if (lead.source === "Website" && lead.webFormId) {
                    const activeOverride = automation.formOverrides?.find(
                        ov => String(ov.formId) === String(lead.webFormId) && ov.isActive
                    );

                    if (activeOverride) {
                        effectiveAutomation = {
                            ...automation,
                            template: activeOverride.template,
                            variableMappings: activeOverride.variableMappings
                        };
                    }
                }

                const components = buildTemplateComponents(
                    effectiveAutomation,
                    lead
                );

                await sendInternalTemplateMessage({
                    companyId: lead.company,
                    to: normalizedPhone,
                    template: {
                        name: effectiveAutomation.template.name,
                        language: effectiveAutomation.template.language,
                        components
                    },
                    fullTemplate: {
                        name: effectiveAutomation.template.name,
                        language: effectiveAutomation.template.language,
                        components: effectiveAutomation.template.components || []
                    },
                    source: "lead_automation"
                });

            } catch (err) {
                console.error("Automation send failed:", err.message);
            }
        }

    } catch (err) {
        console.error("runLeadWhatsAppAutomations error:", err.message);
    }
};
