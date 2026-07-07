import axios from 'axios';
import MetaIntegration from '../models/metaIntegration.model.js';
import { processLeadEvent } from './leadService.js';

/**
 * Fetches all leads from all forms of all pages for a company
 * and processes them through the existing pipeline (dedup-safe)
 */
const metaSyncService = async (companyId) => {
    const integration = await MetaIntegration.findOne({
        company: companyId,
        isActive: true
    });

    if (!integration) {
        throw new Error('No active Meta integration found for this company');
    }

    let totalAdded = 0;
    let totalSkipped = 0;
    let totalLeadsAcrossAllPages = 0;

    for (const page of integration.connectedPages) {
        if (!page.pageAccessToken) {
            console.warn(`Skipping page ${page.pageId} — no access token`);
            continue;
        }

        // Step 1: Get all leadgen forms for this page
        let formsUrl = `https://graph.facebook.com/v24.0/${page.pageId}/leadgen_forms`;
        let allForms = [];

        while (formsUrl) {
            const formsResp = await axios.get(formsUrl, {
                params: {
                    access_token: page.pageAccessToken,
                    fields: 'id,name,leads_count',
                    limit: 100
                }
            });
            allForms.push(...(formsResp.data?.data || []));
            formsUrl = formsResp.data?.paging?.next || null;
        }

        // Step 2: For each form, paginate through ALL leads
        for (const form of allForms) {
            // Accumulate total leads count across all forms for this page
            totalLeadsAcrossAllPages += form.leads_count || 0;

            let leadsUrl = `https://graph.facebook.com/v24.0/${form.id}/leads`;
            let leadsParams = {
                access_token: page.pageAccessToken,
                limit: 100
            };

            while (leadsUrl) {
                const leadsResp = await axios.get(leadsUrl, { params: leadsParams });
                const leads = leadsResp.data?.data || [];

                for (const lead of leads) {
                    try {
                        const result = await processLeadEvent({
                            pageId: page.pageId,
                            formName: form.name,
                            raw: { ...lead, form_id: form.id }
                        });

                        // null/undefined = duplicate skipped inside processLeadEvent
                        if (result?._id) {
                            totalAdded++;
                        } else {
                            totalSkipped++;
                        }
                    } catch (err) {
                        console.error(`Failed processing lead ${lead.id}:`, err.message);
                    }
                }

                leadsUrl = leadsResp.data?.paging?.next || null;
                leadsParams = {}; // already baked into next URL
            }
        }
    }

    // Step 3: Update totalLeadsFetched to reflect ALL leads on this meta page
    // (not just newly added — this is the true total from Meta's side)
    await MetaIntegration.findOneAndUpdate(
        { company: companyId },
        {
            $set: {
                totalLeadsFetched: totalLeadsAcrossAllPages,
                lastSyncAt: new Date()
            }
        }
    );

    console.log(`Sync complete for ${companyId}: added=${totalAdded} skipped=${totalSkipped} metaTotal=${totalLeadsAcrossAllPages}`);

    return {
        added: totalAdded,
        skipped: totalSkipped,
        metaTotal: totalLeadsAcrossAllPages
    };
};

export default metaSyncService;

// // services/metaSyncService.js
// import axios from 'axios';
// import Lead from '../models/lead.model.js';
// import MetaIntegration from '../models/metaIntegration.model.js';
// import { getDefaultLeadStatus } from '../utils/defaultStatus.js';

// class MetaSyncService {

//     // Sync leads for a company
//     async syncCompanyLeads(companyId) {
//         try {
//             const integration = await MetaIntegration.findOne({
//                 company: companyId,
//                 isActive: true
//             });

//             if (!integration) return;

//             // Check token
//             if (new Date() > integration.tokenExpiry) {
//                 await this.refreshToken(integration);
//             }

//             let newLeadsCount = 0;

//             // Har connected page se leads fetch karo
//             for (const page of integration.connectedPages) {
//                 const leads = await this.fetchPageLeads(page.pageId, integration.accessToken);
//                 const savedCount = await this.saveLeads(leads, integration);
//                 newLeadsCount += savedCount;
//             }

//             // Update sync time
//             await MetaIntegration.findByIdAndUpdate(integration._id, {
//                 lastSyncAt: new Date(),
//                 $inc: { totalLeadsFetched: newLeadsCount }
//             });

//             return newLeadsCount;

//         } catch (error) {
//             console.error(`Sync error for company ${companyId}:`, error);
//         }
//     }

//     // Fetch leads from a page
//     async fetchPageLeads(pageId, accessToken) {
//         try {
//             // Get lead forms
//             const formsResponse = await axios.get(
//                 `https://graph.facebook.com/v24.0/${pageId}/leadgen_forms`,
//                 { params: { access_token: accessToken } }
//             );

//             console.log("Lead gen Forms Response: ", formsResponse.data);

//             let allLeads = [];

//             // Har form se leads lo
//             for (const form of formsResponse.data.data) {
//                 const leadsResponse = await axios.get(
//                     `https://graph.facebook.com/v24.0/${form.id}/leads`,
//                     { params: { access_token: accessToken } }
//                 );

//                 allLeads = [...allLeads, ...leadsResponse.data.data];
//             }

//             return allLeads;

//         } catch (error) {
//             console.error('Error fetching page leads:', error);
//             return [];
//         }
//     }

//     // Save leads to database
//     async saveLeads(metaLeads, integration) {
//         let savedCount = 0;

//         for (const metaLead of metaLeads) {
//             try {
//                 // Check if lead already exists
//                 const existing = await Lead.findOne({
//                     company: integration.company,
//                     $or: [
//                         { email: this.getLeadField(metaLead, 'email') },
//                         { phoneNo: this.getLeadField(metaLead, 'phone_number') }
//                     ]
//                 });

//                 if (!existing) {

//                     const defaultLeadStatus = await getDefaultLeadStatus();

//                     const leadData = {
//                         company: integration.company,
//                         name: this.getLeadName(metaLead),
//                         email: this.getLeadField(metaLead, 'email'),
//                         phoneNo: this.getLeadField(metaLead, 'phone_number'),
//                         description: `Meta Ads Lead - ${new Date().toLocaleString()}`,
//                         source: 'Meta Ads',
//                         pipeline: integration.defaultPipeline,
//                         assignedTo: integration.defaultAssignedTo,
//                         status: defaultLeadStatus
//                         // assignedTeam: integration.defaultAssignedTeam,
//                         // createdBy: integration.defaultAssignedTo
//                     };

//                     await new Lead(leadData).save();
//                     savedCount++;
//                 }
//             } catch (error) {
//                 console.error('Error saving lead:', error);
//             }
//         }

//         return savedCount;
//     }

//     getLeadField(lead, fieldName) {
//         const field = lead.field_data?.find(f =>
//             f.name === fieldName || f.name.includes(fieldName)
//         );
//         return field?.values?.[0] || '';
//     }

//     getLeadName(lead) {
//         const fullName = this.getLeadField(lead, 'full_name');
//         if (fullName) return fullName;

//         const firstName = this.getLeadField(lead, 'first_name');
//         const lastName = this.getLeadField(lead, 'last_name');
//         return `${firstName} ${lastName}`.trim();
//     }

//     async refreshToken(integration) {
//         // Token refresh logic
//         // Currently simple - client se naya token mangwana hoga
//         await MetaIntegration.findByIdAndUpdate(integration._id, {
//             isActive: false
//         });
//         throw new Error('Token expired. Please reconnect Meta account.');
//     }
// }

// export default new MetaSyncService();