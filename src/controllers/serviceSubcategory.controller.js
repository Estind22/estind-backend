// src/controllers/serviceSubcategory.controller.js
import mongoose from "mongoose";
import { ServiceSubcategory } from "../models/serviceSubcategory.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Create a service subcategory
// @route   POST /api/v1/service-subcategories
// @access  Private (Admin)
const createServiceSubcategory = asyncHandler(async (req, res) => {
    const { name, slug, image, categories, availableCities, active } = req.body;

    if (!name || !slug) {
        throw new ApiError(400, "Name and slug are required");
    }

    // Validate each category ID in array
    const categoryArr = Array.isArray(categories) ? categories : (categories ? [categories] : []);
    for (const cid of categoryArr) {
        if (!mongoose.Types.ObjectId.isValid(cid)) {
            throw new ApiError(400, `Invalid category ID: ${cid}`);
        }
    }

    // Validate each city ID in array
    const cityArr = Array.isArray(availableCities) ? availableCities : (availableCities ? [availableCities] : []);
    for (const cid of cityArr) {
        if (!mongoose.Types.ObjectId.isValid(cid)) {
            throw new ApiError(400, `Invalid city ID: ${cid}`);
        }
    }

    const existing = await ServiceSubcategory.findOne({ slug: slug.toLowerCase() });
    if (existing) throw new ApiError(400, "A subcategory with this slug already exists");

    const subcategory = await ServiceSubcategory.create({
        name: name.trim(),
        slug: slug.toLowerCase().trim(),
        image: image || "",
        categories: categoryArr,
        availableCities: cityArr,
        active: active !== undefined ? active : true,
    });

    await subcategory.populate([
        { path: "categories", select: "name slug active" },
        { path: "availableCities", select: "name slug active" }
    ]);

    return res.status(201).json(new ApiResponse(201, subcategory, "Service subcategory created successfully"));
});

// @desc    Update a service subcategory
// @route   PUT /api/v1/service-subcategories/:id
// @access  Private (Admin)
const updateServiceSubcategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, slug, image, categories, availableCities, active } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid subcategory ID");

    const subcategory = await ServiceSubcategory.findById(id);
    if (!subcategory) throw new ApiError(404, "Service subcategory not found");

    if (slug && slug !== subcategory.slug) {
        const existing = await ServiceSubcategory.findOne({ slug: slug.toLowerCase(), _id: { $ne: id } });
        if (existing) throw new ApiError(400, "A subcategory with this slug already exists");
        subcategory.slug = slug.toLowerCase().trim();
    }

    if (name !== undefined) subcategory.name = name.trim();
    if (image !== undefined) subcategory.image = image;
    if (active !== undefined) subcategory.active = active;

    if (categories !== undefined) {
        const categoryArr = Array.isArray(categories) ? categories : (categories ? [categories] : []);
        for (const cid of categoryArr) {
            if (!mongoose.Types.ObjectId.isValid(cid)) {
                throw new ApiError(400, `Invalid category ID: ${cid}`);
            }
        }
        subcategory.categories = categoryArr;
    }

    if (availableCities !== undefined) {
        const cityArr = Array.isArray(availableCities) ? availableCities : (availableCities ? [availableCities] : []);
        for (const cid of cityArr) {
            if (!mongoose.Types.ObjectId.isValid(cid)) {
                throw new ApiError(400, `Invalid city ID: ${cid}`);
            }
        }
        subcategory.availableCities = cityArr;
    }

    await subcategory.save();
    await subcategory.populate([
        { path: "categories", select: "name slug active" },
        { path: "availableCities", select: "name slug active" }
    ]);

    return res.status(200).json(new ApiResponse(200, subcategory, "Service subcategory updated successfully"));
});

// @desc    Delete a service subcategory
// @route   DELETE /api/v1/service-subcategories/:id
// @access  Private (Admin)
const deleteServiceSubcategory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid subcategory ID");

    const subcategory = await ServiceSubcategory.findByIdAndDelete(id);
    if (!subcategory) throw new ApiError(404, "Service subcategory not found");

    return res.status(200).json(new ApiResponse(200, null, "Service subcategory deleted successfully"));
});

// @desc    Get all service subcategories with pagination and filters
// @route   GET /api/v1/service-subcategories?page=1&search=&category=&active=&city=
// @access  Public / Admin
const getServiceSubcategories = asyncHandler(async (req, res) => {
    const { page = 1, search, category, active, city } = req.query;

    const pageNum = parseInt(page) || 1;
    const filter = {};

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { slug: { $regex: search, $options: "i" } },
        ];
    }

    // Filter subcategories that belong to a specific category
    if (category && mongoose.Types.ObjectId.isValid(category)) {
        filter.categories = category;
    }

    // Filter subcategories that belong to a specific city
    if (city && mongoose.Types.ObjectId.isValid(city)) {
        filter.availableCities = city;
    }

    if (active !== undefined && active !== "all") {
        filter.active = active === "true";
    }

    let limit = pageNum === 1 ? 30 : 10;
    let skip = pageNum === 1 ? 0 : 30 + (pageNum - 2) * 10;

    const totalCount = await ServiceSubcategory.countDocuments(filter);
    const subcategories = await ServiceSubcategory.find(filter)
        .populate("categories", "name slug active")
        .populate("availableCities", "name slug active")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .exec();

    const hasMore = totalCount > skip + subcategories.length;

    return res.status(200).json(
        new ApiResponse(200, { subcategories, pagination: { page: pageNum, limit, totalCount, hasMore } }, "Service subcategories fetched successfully")
    );
});

// @desc    Get single service subcategory by ID or slug
// @route   GET /api/v1/service-subcategories/:idOrSlug
// @access  Public
const getServiceSubcategoryByIdOrSlug = asyncHandler(async (req, res) => {
    const { idOrSlug } = req.params;

    const subcategory = mongoose.Types.ObjectId.isValid(idOrSlug)
        ? await ServiceSubcategory.findById(idOrSlug).populate("categories", "name slug active").populate("availableCities", "name slug active")
        : await ServiceSubcategory.findOne({ slug: idOrSlug.toLowerCase() }).populate("categories", "name slug active").populate("availableCities", "name slug active");

    if (!subcategory) throw new ApiError(404, "Service subcategory not found");

    return res.status(200).json(new ApiResponse(200, subcategory, "Service subcategory fetched successfully"));
});

export { createServiceSubcategory, updateServiceSubcategory, deleteServiceSubcategory, getServiceSubcategories, getServiceSubcategoryByIdOrSlug };
