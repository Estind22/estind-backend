import { City } from "../models/city.model.js";
import { Locality } from "../models/locality.model.js";
import { Project } from "../models/project.model.js";
import { Property } from "../models/property.model.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// @desc    Get active cities count
// @route   GET /api/v1/dashboard/cities/count
const getCitiesCount = asyncHandler(async (req, res) => {
    const count = await City.countDocuments({ active: true });
    return res.status(200).json(new ApiResponse(200, { count }, "Cities count fetched successfully"));
});

// @desc    Get active localities count
// @route   GET /api/v1/dashboard/localities/count
const getLocalitiesCount = asyncHandler(async (req, res) => {
    const count = await Locality.countDocuments({ active: true });
    return res.status(200).json(new ApiResponse(200, { count }, "Localities count fetched successfully"));
});

// @desc    Get active projects count
// @route   GET /api/v1/dashboard/projects/count
const getProjectsCount = asyncHandler(async (req, res) => {
    const count = await Project.countDocuments({ active: true });
    return res.status(200).json(new ApiResponse(200, { count }, "Projects count fetched successfully"));
});

// @desc    Get active properties count
// @route   GET /api/v1/dashboard/properties/count
const getPropertiesCount = asyncHandler(async (req, res) => {
    const count = await Property.countDocuments({ active: true });
    return res.status(200).json(new ApiResponse(200, { count }, "Properties count fetched successfully"));
});

// @desc    Get active keymans count (role matches 'keyman' only)
// @route   GET /api/v1/dashboard/keymans/count
const getKeymansCount = asyncHandler(async (req, res) => {
    const count = await User.countDocuments({ role: "keyman" });
    return res.status(200).json(new ApiResponse(200, { count }, "Keymans count fetched successfully"));
});

export {
    getCitiesCount,
    getLocalitiesCount,
    getProjectsCount,
    getPropertiesCount,
    getKeymansCount
};
