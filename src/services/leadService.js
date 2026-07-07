// src/services/leadService.js
import axios from 'axios';
import MetaIntegration from '../models/metaIntegration.model.js';
import Lead from '../models/lead.model.js';
import { resolveMetaAssignment, resolveFormMapping, validateAndCastField } from './metaAssignmentResolver.js';
import { getDefaultLeadStatus } from '../utils/defaultStatus.js';
import { runLeadWhatsAppAutomations } from './whatsapp/whatsappAutomation.service.js';
import User from '../models/user.model.js';
import Session from '../models/session.model.js';
import { sendFcmPush } from './fcmPushService.js';
import { sendPush } from './pushService.js';
import AssignedHistory from '../models/assignedHistory.model.js';

export const enqueueLeadProcessing = async (payload = {}) => {
  // quick guard
  setImmediate(() => {
    processLeadEvent(payload).catch(err => {
      console.error('enqueueLeadProcessing error', err);
    });
  });
};

export const processLeadEvent = async ({ pageId, leadgenId, formId, formName, raw } = {}) => {
  try {
    const integration = await MetaIntegration.findOne({ 'connectedPages.pageId': pageId });
    if (!integration) {
      console.warn('No MetaIntegration found for page', pageId);
      return;
    }

    const page = integration.connectedPages.find(p => p.pageId === pageId);
    const pageToken = page?.pageAccessToken || integration.accessToken;
    if (!pageToken) {
      console.warn('No page token for', pageId);
      return;
    }

    // Fetch lead data
    let leadData = null;
    if (leadgenId) {
      // individual lead node
      const resp = await axios.get(`https://graph.facebook.com/v24.0/${leadgenId}`, {
        params: { access_token: pageToken }
      });
      leadData = resp.data;
    } else if (formId) {
      // fetch recent leads for the form and pick the most recent
      const resp = await axios.get(`https://graph.facebook.com/v24.0/${formId}/leads`, {
        params: { access_token: pageToken, limit: 5 } // limit small
      });
      leadData = resp.data?.data?.[0] || null;
    } else if (raw) {
      leadData = raw;
    }

    if (!leadData) {
      console.warn('No lead data fetched for', { pageId, leadgenId, formId });
      return;
    }

    // Resolve Form Name dynamically if not provided
    const resolvedFormId = formId || leadData.form_id || "";
    let resolvedFormName = formName || raw?.formName || "";

    if (!resolvedFormName && resolvedFormId) {
      try {
        const formResp = await axios.get(`https://graph.facebook.com/v24.0/${resolvedFormId}`, {
          params: { access_token: pageToken, fields: "name" }
        });
        resolvedFormName = formResp.data?.name || "";
      } catch (formErr) {
        console.error('Error fetching form name from Meta:', formErr.response?.data || formErr.message);
      }
    }

    // Resolve Form Mapping earlier to use fieldMapping during description creation
    const formMapping = await resolveFormMapping(integration.company, resolvedFormId);

    // Normalize fields
    const fieldData = leadData.field_data || [];
    const getField = (key) => {
      const f = fieldData.find(fd => (fd.name || '').toLowerCase().includes(key));
      return f?.values?.[0] || '';
    };

    const email = getField('email') || '';
    const phone = getField('phone') || getField('mobile_phone') || '';
    const fullName = getField('full_name') || `${(leadData.first_name || '')} ${(leadData.last_name || '')}`.trim() || 'Facebook Lead';

    const excludedKeys = ['email', 'phone', 'mobile_phone', 'full_name', 'first_name', 'last_name'];

    const otherFields = [];
    const failedMappings = [];
    const successfullyMappedFields = {}; // crmPath -> castedValue

    if (fieldData.length > 0) {
      for (const fd of fieldData) {
        const name = fd.name || '';
        const lowerName = name.toLowerCase();

        // 1. Skip standard fields (email, phone, name)
        const isStandard = excludedKeys.some(key => lowerName.includes(key));
        if (isStandard) continue;

        const val = fd.values?.join(', ') || '';

        // 2. Check if this field is mapped to a CRM path
        const crmPath = formMapping?.fieldMapping?.[name];
        if (crmPath) {
          const validation = validateAndCastField(crmPath, val);
          if (validation.isValid) {
            successfullyMappedFields[crmPath] = validation.castedValue;
          } else {
            failedMappings.push(`${fd.name}: ${val}`);
          }
        } else {
          otherFields.push(`${fd.name}: ${val}`);
        }
      }
    }

    let description = `Meta Ads Lead - ${new Date().toISOString()}`;
    if (otherFields.length > 0) {
      description += `\n\nForm Data:\n${otherFields.join('\n')}`;
    }
    if (failedMappings.length > 0) {
      description += `\n${failedMappings.join('\n')}`;
    }


    // Dedupe by metaLeadId first, then email, then phone
    const queryOr = [];
    if (leadData.id) queryOr.push({ 'meta.metaLeadId': leadData.id });
    // if (resolvedFormId && phone) queryOr.push(
    //   { 
    //     "":resolvedFormId,
    //     phoneNo: phone 
    //   }
    // );
    // if (email) queryOr.push({ email });

    let existing = null;
    if (queryOr.length) {
      existing = await Lead.findOne({ company: integration.company, $or: queryOr });
    }

    if (existing) {
      console.log('Duplicate lead detected - skipping save', existing._id);
      return null;
    }

    const defaultLeadStatus = await getDefaultLeadStatus();

    // Create lead doc
    const leadDoc = new Lead({
      company: integration.company,
      name: fullName || 'Facebook Lead',
      email: email || undefined,
      phoneNo: phone || undefined,
      description,
      source: 'Meta Ads',
      pipeline: integration.defaultPipeline,
      status: defaultLeadStatus,
      meta: {
        metaLeadId: leadData.id || "",
        metaFormId: resolvedFormId,
        metaFormName: resolvedFormName,
        metaPageId: pageId,

        metaAdId: leadData.ad_id || "",
        metaAdName: leadData.ad_name || "",

        metaCampaignId: leadData.campaign_id || "",
        metaCampaignName: leadData.campaign_name || ""
      }
    });

    const assignment = await resolveMetaAssignment({
      companyId: integration.company,
      pageId,
      formId: leadDoc.meta.metaFormId
    });

    if (assignment) {
      leadDoc.assignedTo = assignment.userId;
      leadDoc.assignment = {
        assignedByRule: assignment.assignedBy, // "PAGE" | "FORM"
        assignmentRefId: assignment.assignmentRefId
      };
    } else {
      leadDoc.assignedTo = null;
      leadDoc.assignment = {
        assignedByRule: "NONE",
        assignmentRefId: null
      };
    }

    // ── Apply service / project / property / custom field mappings ──
    if (formMapping) {
      if (formMapping.service) leadDoc.service = formMapping.service;
      if (formMapping.project) leadDoc.project = formMapping.project;
      if (formMapping.property) leadDoc.property = formMapping.property;

      // Apply pre-validated custom field mapping dynamically
      for (const [crmPath, castedValue] of Object.entries(successfullyMappedFields)) {
        leadDoc.set(crmPath, castedValue);
      }
    }

    await leadDoc.save();

    // Record assignment history
    if (leadDoc?.assignedTo) {
      await recordMetaAssignmentHistory(leadDoc, leadDoc?.assignedTo);
    }

    setImmediate(() => {
      runLeadWhatsAppAutomations(leadDoc).catch(console.error);
    });

    // console.log('Saved lead', leadDoc._id);

    // increment integration totalLeadsFetched and update lastSyncAt
    await MetaIntegration.findByIdAndUpdate(integration._id, {
      $inc: { totalLeadsFetched: 1 },
      $set: { lastSyncAt: new Date() }
    });

    // 🔔 Push notifications (non-blocking)
    setImmediate(() => {
      sendMetaLeadNotifications({
        leadDoc,
        companyId: integration.company,
        assignedUserId: assignment?.userId || null,
      }).catch(err => console.error('[MetaLead] Push notification error:', err?.message || err));
    });

    return leadDoc;
  } catch (err) {
    console.error('processLeadEvent error', err.response?.data || err.message || err);
    throw err;
  }
};

// ─────────────────────────────────────────────────────────
// Push notification helper for incoming Meta leads
// ─────────────────────────────────────────────────────────
async function sendMetaLeadNotifications({ leadDoc, companyId, assignedUserId }) {
  const leadName = leadDoc.name || 'Facebook Lead';

  // ── 1. Notify all company admins ──────────────────────
  const adminTitle = 'New Meta Lead';
  const adminBody = `New lead received from Meta Ads: ${leadName}`;

  const admins = await User.find({
    company: companyId,
    systemRole: 'company_admin',
    active: true,
  }).lean();

  await Promise.all(
    admins.map(admin => _pushToUser({
      userId: admin._id,
      companyId,
      title: adminTitle,
      body: adminBody,
      tag: 'meta-lead-received',
      url: `/dashboard/leads/${leadDoc._id}`,
      extraData: { type: 'meta_lead_received', leadId: leadDoc._id.toString() },
    }))
  );

  // ── 2. Notify assigned user (if any) ─────────────────
  if (assignedUserId) {
    const assignedTitle = 'Meta Lead Assigned';
    const assignedBody = `New lead from Meta Ads has been assigned to you: ${leadName}`;

    await _pushToUser({
      userId: assignedUserId,
      companyId,
      title: assignedTitle,
      body: assignedBody,
      tag: 'meta-lead-assigned',
      url: `/dashboard/leads/${leadDoc._id}`,
      extraData: { type: 'meta_lead_assigned', leadId: leadDoc._id.toString() },
    });
  }
}

// Internal helper – sends both FCM and web push to a single user
async function _pushToUser({ userId, companyId, title, body, tag, url, extraData }) {
  // 1️⃣ Firebase FCM (mobile / tablet)
  await sendFcmPush(userId, companyId, title, body, extraData);

  // 2️⃣ Web push (browser)
  const webSubs = await Session.find({
    userId,
    active: true,
    deviceType: 'mobile',
    subscription: { $exists: true, $ne: null }
  }).lean();

  if (!webSubs.length) return;

  const webPayload = { title, body, tag, url };

  await Promise.all(
    webSubs.map(async s => {
      try {
        await sendPush(s.subscription, webPayload);
      } catch (err) {
        const code = err?.statusCode || err?.status || err?.body?.status;
        if (code === 410 || code === 404) {
          await Session.updateOne({ _id: s._id }, { $unset: { subscription: 1 } });
        }
      }
    })
  );
}

/**
 * Records assignment history for Meta Ads leads.
 * Also resolves team/group for the assigned user if missing.
 */
async function recordMetaAssignmentHistory(lead, assignedToId) {
  if (!assignedToId) return;

  // Resolve team/group if missing
  if (!lead.team || !lead.group) {
    const user = await User.findById(assignedToId).select('team group').lean();
    if (user) {
      let needsSave = false;
      if (!lead.team && user.team) { lead.team = user.team; needsSave = true; }
      if (!lead.group && user.group) { lead.group = user.group; needsSave = true; }
      if (needsSave) await lead.save();
    }
  }

  const history = await AssignedHistory.create({
    lead: lead._id,
    fromUser: undefined,
    toUser: assignedToId,
    toTeam: lead.team || undefined,
    changedBy: undefined, // System assignment
  });

  await Lead.findByIdAndUpdate(lead._id, {
    $push: { assignHistory: history._id }
  });
}
