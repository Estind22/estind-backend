// src/services/leadAssignment.service.js
import MetaIntegration from '../models/metaIntegration.model.js';
import User from '../models/user.model.js';
import Lead from '../models/lead.model.js';

/**
 * Assign a lead to next active employee in round robin.
 * assignmentIndex stored inside MetaIntegration document.
 */
export const assignLeadToEmployee = async (companyId, leadDoc) => {
  // fetch active employees of the company
  const employees = await User.find({
    company: companyId,
    role: 'employee',
    active: true
  }).select('_id name email').lean();

  if (!employees || employees.length === 0) {
    console.warn('No active employees found to assign lead for company', companyId);
    return null;
  }

  // Atomically increment assignmentIndex and get new value
  const updatedIntegration = await MetaIntegration.findOneAndUpdate(
    { company: companyId },
    { $inc: { assignmentIndex: 1 } },
    { new: true, upsert: true }
  );

  const idx = (updatedIntegration.assignmentIndex || 0) % employees.length;
  const assigned = employees[idx];

  // Update lead doc
  await Lead.findByIdAndUpdate(leadDoc._id, {
    assignedTo: assigned._id,
    $push: { assignHistory: { /* you can push an AssignedHistory doc id later */ } }
  });

  // You can add notification hooks here: push / email
  console.log(`Assigned lead ${leadDoc._id} to ${assigned._id} (${assigned.name})`);

  return assigned;
};
