import Company from "../../models/company.model.js";
import { ApiError } from "../ApiError.js";

export const increaseStorage = async (companyId, size) => {
    const company = await Company.findById(companyId);
    if (!company) throw new ApiError(404, "Company not found");

    const newUsage = company.storage.used + size;

    if (newUsage > company.storage.limit) {
        throw new ApiError(400, "Storage limit exceeded");
    }

    company.storage.used = newUsage;
    await company.save();
};

export const decreaseStorage = async (companyId, size) => {
    const company = await Company.findById(companyId);
    if (!company) throw new ApiError(404, "Company not found");

    company.storage.used = Math.max(0, company.storage.used - size);
    await company.save();
};
