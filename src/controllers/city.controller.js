// src/controllers/city.controller.js
import mongoose from "mongoose";
import { City } from "../models/city.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Create a city
// @route   POST /api/v1/cities
// @access  Private (Admin)
const createCity = asyncHandler(async (req, res) => {
    const { name, slug, image, icon, alternateNames, active } = req.body;

    if (!name || !slug) {
        throw new ApiError(400, "Name and slug are required");
    }

    const existing = await City.findOne({ slug: slug.toLowerCase() });
    if (existing) {
        throw new ApiError(400, "A city with this slug already exists");
    }

    const altNames = Array.isArray(alternateNames) ? alternateNames : (alternateNames ? [alternateNames] : []);

    const city = await City.create({
        name: name.trim(),
        slug: slug.toLowerCase().trim(),
        image: image || "",
        icon: icon || "",
        alternateNames: altNames.map(n => n.toLowerCase().trim()),
        active: active !== undefined ? active : true,
    });

    return res.status(201).json(new ApiResponse(201, city, "City created successfully"));
});

// @desc    Update a city
// @route   PUT /api/v1/cities/:id
// @access  Private (Admin)
const updateCity = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, slug, image, icon, alternateNames, active } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid city ID");
    }

    const city = await City.findById(id);
    if (!city) throw new ApiError(404, "City not found");

    if (slug && slug !== city.slug) {
        const existing = await City.findOne({ slug: slug.toLowerCase(), _id: { $ne: id } });
        if (existing) throw new ApiError(400, "A city with this slug already exists");
        city.slug = slug.toLowerCase().trim();
    }

    if (name !== undefined) city.name = name.trim();
    if (image !== undefined) city.image = image;
    if (icon !== undefined) city.icon = icon;
    if (active !== undefined) city.active = active;

    if (alternateNames !== undefined) {
        const altNames = Array.isArray(alternateNames) ? alternateNames : (alternateNames ? [alternateNames] : []);
        city.alternateNames = altNames.map(n => n.toLowerCase().trim());
    }

    await city.save();
    return res.status(200).json(new ApiResponse(200, city, "City updated successfully"));
});

// @desc    Delete a city
// @route   DELETE /api/v1/cities/:id
// @access  Private (Admin)
const deleteCity = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid city ID");
    }

    const city = await City.findByIdAndDelete(id);
    if (!city) throw new ApiError(404, "City not found");

    return res.status(200).json(new ApiResponse(200, null, "City deleted successfully"));
});

// @desc    Get all cities with pagination and filters
// @route   GET /api/v1/cities?page=1&search=&active=
// @access  Public / Admin
const getCities = asyncHandler(async (req, res) => {
    const {
        page = 1,
        search,
        active,
    } = req.query;

    const pageNum = parseInt(page) || 1;
    const filter = {};

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { slug: { $regex: search, $options: "i" } },
            { alternateNames: { $regex: search, $options: "i" } }
        ];
    }

    if (active !== undefined && active !== "all") {
        filter.active = active === "true";
    }

    let limit = pageNum === 1 ? 30 : 10;
    let skip = pageNum === 1 ? 0 : 30 + (pageNum - 2) * 10;

    const totalCount = await City.countDocuments(filter);
    const cities = await City.find(filter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .exec();

    const hasMore = totalCount > skip + cities.length;

    return res.status(200).json(
        new ApiResponse(200, { cities, pagination: { page: pageNum, limit, totalCount, hasMore } }, "Cities fetched successfully")
    );
});

// @desc    Get a single city by ID or slug
// @route   GET /api/v1/cities/:idOrSlug
// @access  Public
const getCityByIdOrSlug = asyncHandler(async (req, res) => {
    const { idOrSlug } = req.params;

    const city = mongoose.Types.ObjectId.isValid(idOrSlug)
        ? await City.findById(idOrSlug)
        : await City.findOne({ 
            $or: [
                { slug: idOrSlug.toLowerCase() },
                { alternateNames: idOrSlug.toLowerCase() }
            ]
        });

    if (!city) throw new ApiError(404, "City not found");

    return res.status(200).json(new ApiResponse(200, city, "City fetched successfully"));
});

export { createCity, updateCity, deleteCity, getCities, getCityByIdOrSlug };
