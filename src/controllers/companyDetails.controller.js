import { CompanyDetails } from "../models/company_details.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// @desc    Get company details settings (fetches single settings document)
// @route   GET /api/v1/company-details
// @access  Public
const getCompanyDetails = asyncHandler(async (req, res) => {
    let details = await CompanyDetails.findOne();
    if (!details) {
      // Create a default placeholder if none exists yet
      details = await CompanyDetails.create({});
    }
    return res.status(200).json(
        new ApiResponse(200, details, "Company details retrieved successfully")
    );
});

// @desc    Update or create company details settings
// @route   POST /api/v1/company-details
// @access  Private (Admin)
const updateCompanyDetails = asyncHandler(async (req, res) => {
    const {
        name, email, phone, address,
        instagramLink, linkedinLink, whatsappNumber,
        facebookLink, youtubeLink, twitterLink
    } = req.body;

    let details = await CompanyDetails.findOne();
    if (!details) {
        details = new CompanyDetails({});
    }

    if (name !== undefined) details.name = name;
    if (email !== undefined) details.email = email;
    if (phone !== undefined) details.phone = phone;
    if (address !== undefined) details.address = address;
    if (instagramLink !== undefined) details.instagramLink = instagramLink;
    if (linkedinLink !== undefined) details.linkedinLink = linkedinLink;
    if (whatsappNumber !== undefined) details.whatsappNumber = whatsappNumber;
    if (facebookLink !== undefined) details.facebookLink = facebookLink;
    if (youtubeLink !== undefined) details.youtubeLink = youtubeLink;
    if (twitterLink !== undefined) details.twitterLink = twitterLink;

    await details.save();

    return res.status(200).json(
        new ApiResponse(200, details, "Company details updated successfully")
    );
});

export {
    getCompanyDetails,
    updateCompanyDetails
};
