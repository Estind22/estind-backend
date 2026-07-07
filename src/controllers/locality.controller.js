import { Locality } from "../models/locality.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

// @desc    Create a new Locality
// @route   POST /api/v1/localities
// @access  Private (Admin)
const createLocality = asyncHandler(async (req, res) => {
    const { name, slug, city, active } = req.body;

    if (!name || !slug || !city) {
        throw new ApiError(400, "Name, slug, and parent city reference are required");
    }

    if (!mongoose.Types.ObjectId.isValid(city)) {
        throw new ApiError(400, "Invalid parent City ID");
    }

    try {
        const locality = await Locality.create({
            name,
            slug: slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
            city,
            active: active !== undefined ? active : true
        });

        return res.status(201).json(
            new ApiResponse(201, locality, "Locality registered successfully")
        );
    } catch (error) {
        if (error.message === "This locality is already available") {
            throw new ApiError(400, "This locality is already available");
        }
        throw new ApiError(500, error.message || "Failed to create locality");
    }
});

// @desc    Get all localities (with optional City filter)
// @route   GET /api/v1/localities
// @access  Public
const getAllLocalities = asyncHandler(async (req, res) => {
    const { city, active, search, page = 1, limit = 10 } = req.query;
    const filter = {};

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skipNum = (pageNum - 1) * limitNum;

    if (city && mongoose.Types.ObjectId.isValid(city)) {
        filter.city = city;
    }
    if (active !== undefined) {
        filter.active = active === "true";
    }

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { slug: { $regex: search, $options: "i" } }
        ];
    }

    const totalCount = await Locality.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limitNum);

    const localities = await Locality.find(filter)
        .populate("city", "name slug")
        .sort({ name: 1 })
        .skip(skipNum)
        .limit(limitNum);

    return res.status(200).json(
        new ApiResponse(200, {
            localities,
            totalCount,
            totalPages,
            currentPage: pageNum,
            limit: limitNum
        }, "Localities list fetched successfully")
    );
});

// @desc    Get Locality details by ID
// @route   GET /api/v1/localities/:id
// @access  Public
const getLocalityById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid Locality ID");
    }

    const locality = await Locality.findById(id).populate("city", "name slug");
    if (!locality) {
        throw new ApiError(404, "Locality not found");
    }

    return res.status(200).json(
        new ApiResponse(200, locality, "Locality details fetched successfully")
    );
});

// @desc    Update a Locality
// @route   PUT /api/v1/localities/:id
// @access  Private (Admin)
const updateLocality = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, slug, city, active } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid Locality ID");
    }

    const locality = await Locality.findById(id);
    if (!locality) {
        throw new ApiError(404, "Locality not found");
    }

    if (name !== undefined) locality.name = name;
    if (slug !== undefined) locality.slug = slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    if (active !== undefined) locality.active = active;
    
    if (city !== undefined) {
        if (!mongoose.Types.ObjectId.isValid(city)) {
            throw new ApiError(400, "Invalid City ID");
        }
        locality.city = city;
    }

    try {
        await locality.save();
        return res.status(200).json(
            new ApiResponse(200, locality, "Locality details updated successfully")
        );
    } catch (error) {
        if (error.message === "This locality is already available") {
            throw new ApiError(400, "This locality is already available");
        }
        throw new ApiError(500, error.message || "Failed to update locality");
    }
});

// @desc    Delete a Locality
// @route   DELETE /api/v1/localities/:id
// @access  Private (Admin)
const deleteLocality = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid Locality ID");
    }

    const deleted = await Locality.findByIdAndDelete(id);
    if (!deleted) {
        throw new ApiError(404, "Locality not found");
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Locality deleted successfully")
    );
});

export {
    createLocality,
    getAllLocalities,
    getLocalityById,
    updateLocality,
    deleteLocality
};
