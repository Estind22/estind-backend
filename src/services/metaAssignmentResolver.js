import MetaPageAssignment from "../models/metaPageAssignment.model.js";
import MetaFormMapping from "../models/metaFormMapping.model.js";
import Lead from "../models/lead.model.js";
import mongoose from "mongoose";


export const resolveMetaAssignment = async ({
    companyId,
    pageId,
    formId
}) => {
    const config = await MetaPageAssignment.findOne({
        company: companyId,
        pageId,
        isActive: true
    });

    if (!config) return null;

    // 1) FORM override
    let rule = null;

    if (formId) {
        rule = config.rules.find(
            (r) => r.ruleType === "FORM" && r.refId === formId
        );
    }

    // 2) PAGE fallback
    if (!rule) {
        rule = config.rules.find(
            (r) => r.ruleType === "PAGE" && r.refId === pageId
        );
    }

    if (!rule || !rule.users?.length) return null;

    // Always ROUND ROBIN
    const index = rule.lastAssignedIndex % rule.users.length;
    const assignedUser = rule.users[index];

    rule.lastAssignedIndex = index + 1;
    await config.save();

    return {
        userId: assignedUser,
        assignedBy: rule.ruleType, // "FORM" | "PAGE"
        assignmentRefId: rule.refId
    };
};

/**
 * Resolve service / project / property for a given formId.
 * Returns { service, project, property } or null.
 */
export const resolveFormMapping = async (companyId, formId) => {
    if (!formId) return null;

    const mapping = await MetaFormMapping.findOne({
        company: companyId,
        formId
    }).lean();

    if (!mapping) return null;

    return {
        service: mapping.service || null,
        project: mapping.project || null,
        property: mapping.property || null,
        fieldMapping: mapping.fieldMapping || null
    };
};

/**
 * Validate and cast a value to the target crmPath in the Lead schema.
 * Returns { isValid: boolean, castedValue?: any }
 */
export const validateAndCastField = (crmPath, value) => {
    if (value === undefined || value === null || value === '') {
        return { isValid: false };
    }

    const schemaType = Lead.schema.path(crmPath);
    if (!schemaType) {
        return { isValid: false };
    }

    const strVal = value.toString().trim();

    // 1. Handle String types (check enums if present)
    if (schemaType.instance === 'String') {
        if (schemaType.enumValues && schemaType.enumValues.length > 0) {
            const normalizedValue = strVal.toLowerCase();
            const matchedEnum = schemaType.enumValues.find(
                val => val.toLowerCase() === normalizedValue
            );
            if (matchedEnum) {
                return { isValid: true, castedValue: matchedEnum };
            }
            return { isValid: false };
        }
        return { isValid: true, castedValue: strVal };
    }

    // 2. Handle Number types
    if (schemaType.instance === 'Number') {
        const num = Number(strVal);
        if (isNaN(num)) {
            return { isValid: false };
        }
        return { isValid: true, castedValue: num };
    }

    // 3. Handle Date types
    if (schemaType.instance === 'Date') {
        const date = new Date(strVal);
        if (isNaN(date.getTime())) {
            return { isValid: false };
        }
        return { isValid: true, castedValue: strVal };
    }

    // 4. Handle Boolean types
    if (schemaType.instance === 'Boolean') {
        const lowerVal = strVal.toLowerCase();
        if (lowerVal === 'true' || lowerVal === '1' || lowerVal === 'yes') {
            return { isValid: true, castedValue: true };
        }
        if (lowerVal === 'false' || lowerVal === '0' || lowerVal === 'no') {
            return { isValid: true, castedValue: false };
        }
        return { isValid: false };
    }

    // 5. Handle ObjectID types
    if (schemaType.instance === 'ObjectID') {
        if (mongoose.Types.ObjectId.isValid(strVal)) {
            return { isValid: true, castedValue: strVal };
        }
        return { isValid: false };
    }

    // Fallback to Mongoose built-in cast
    try {
        const casted = schemaType.cast(value);
        return { isValid: true, castedValue: casted };
    } catch (error) {
        return { isValid: false };
    }
};
