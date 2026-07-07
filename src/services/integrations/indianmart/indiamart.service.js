import IndiaMartIntegration from "../../../models/indiamartIntegration.model.js";
import Lead from "../../../models/lead.model.js";
import { LEAD_SOURCES } from "../../../utils/enums.js";
import { runLeadWhatsAppAutomations } from "../../whatsapp/whatsappAutomation.service.js";

const normalizeIndiaMartLead = (payload, integration, companyId) => {
  return {
    company: companyId,

    name: payload?.SENDER_NAME || "IndiaMART Lead",
    phoneNo: payload?.SENDER_MOBILE,
    email: payload?.SENDER_EMAIL,

    source: LEAD_SOURCES.INDIA_MART,
    description: payload?.QUERY_MESSAGE || payload?.SUBJECT || "",

    pipeline: integration?.defaultPipeline,
    assignedTo: integration?.defaultAssignedTo,

    createdAt: payload?.QUERY_TIME,
    indiamart: {
      indiamartLeadId: payload?.UNIQUE_QUERY_ID,
      product: payload?.QUERY_PRODUCT_NAME,
      address: payload?.SENDER_ADDRESS,
      raw: payload
    }
  };
};

export const handleIndiaMart = async ({ companyId, payload }) => {
  // 1️⃣ Raw payload logging (MUST)
  console.log("Indiamart raw payload", companyId, payload);

  // 2️⃣ Validate payload
  //   validateIndiaMartPayload(payload);

  // 3️⃣ Fetch integration config
  const integration = await IndiaMartIntegration.findOne({
    company: companyId,
    isActive: true
  });

  if (!integration) {
    console.warn("IndiaMART integration inactive for company", companyId);
    return;
  }

  // 4️⃣ Normalize
  const leadData = normalizeIndiaMartLead(payload, integration, companyId);

  // 5️⃣ Dedupe
  const isDuplicate = await Lead.findOne({
    company: companyId,
    "indiamart.indiamartLeadId": leadData?.indiamart?.indiamartLeadId
    //   $or: [
    //       { phoneNo: leadData.phoneNo },
    //       { email: leadData.email }
    //   ]
  });
  if (isDuplicate) return;

  // 6️⃣ Save
  const lead = await Lead.create(leadData);

  setImmediate(() => {
    runLeadWhatsAppAutomations(lead).catch(console.error);
  });

  // 7️⃣ Stats update
  await IndiaMartIntegration.updateOne(
    { _id: integration._id },
    { $inc: { totalLeadsReceived: 1 }, $set: { lastLeadAt: new Date() } }
  );

  // 8️⃣ Assignment (optional async)
  //   assignLead(companyId, lead).catch(console.error);
};
