// src/controllers/serviceCategory.controller.js
import mongoose from "mongoose";
import { ServiceCategory } from "../models/serviceCategory.model.js";
import { ServiceSubcategory } from "../models/serviceSubcategory.model.js";
import { Service } from "../models/service.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Create a service category
// @route   POST /api/v1/service-categories
// @access  Private (Admin)
const createServiceCategory = asyncHandler(async (req, res) => {
    const { name, slug, image, availableCities, active } = req.body;

    if (!name || !slug) {
        throw new ApiError(400, "Name and slug are required");
    }

    const cityArr = Array.isArray(availableCities) ? availableCities : (availableCities ? [availableCities] : []);
    for (const cid of cityArr) {
        if (!mongoose.Types.ObjectId.isValid(cid)) {
            throw new ApiError(400, `Invalid city ID: ${cid}`);
        }
    }

    const existing = await ServiceCategory.findOne({ slug: slug.toLowerCase() });
    if (existing) throw new ApiError(400, "A category with this slug already exists");

    const category = await ServiceCategory.create({
        name: name.trim(),
        slug: slug.toLowerCase().trim(),
        image: image || "",
        availableCities: cityArr,
        active: active !== undefined ? active : true,
    });

    await category.populate("availableCities", "name slug active");

    return res.status(201).json(new ApiResponse(201, category, "Service category created successfully"));
});

// @desc    Update a service category
// @route   PUT /api/v1/service-categories/:id
// @access  Private (Admin)
const updateServiceCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, slug, image, availableCities, active } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid category ID");

    const category = await ServiceCategory.findById(id);
    if (!category) throw new ApiError(404, "Service category not found");

    if (slug && slug !== category.slug) {
        const existing = await ServiceCategory.findOne({ slug: slug.toLowerCase(), _id: { $ne: id } });
        if (existing) throw new ApiError(400, "A category with this slug already exists");
        category.slug = slug.toLowerCase().trim();
    }

    if (name !== undefined) category.name = name.trim();
    if (image !== undefined) category.image = image;
    if (active !== undefined) category.active = active;

    if (availableCities !== undefined) {
        const cityArr = Array.isArray(availableCities) ? availableCities : (availableCities ? [availableCities] : []);
        for (const cid of cityArr) {
            if (!mongoose.Types.ObjectId.isValid(cid)) {
                throw new ApiError(400, `Invalid city ID: ${cid}`);
            }
        }
        category.availableCities = cityArr;
    }

    await category.save();
    await category.populate("availableCities", "name slug active");
    return res.status(200).json(new ApiResponse(200, category, "Service category updated successfully"));
});

// @desc    Delete a service category
// @route   DELETE /api/v1/service-categories/:id
// @access  Private (Admin)
const deleteServiceCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid category ID");

    const category = await ServiceCategory.findByIdAndDelete(id);
    if (!category) throw new ApiError(404, "Service category not found");

    return res.status(200).json(new ApiResponse(200, null, "Service category deleted successfully"));
});

// @desc    Get all service categories with pagination and filters
// @route   GET /api/v1/service-categories?page=1&search=&active=&city=
// @access  Public / Admin
const getServiceCategories = asyncHandler(async (req, res) => {
    const { page = 1, search, active, city } = req.query;

    const pageNum = parseInt(page) || 1;
    const filter = {};

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { slug: { $regex: search, $options: "i" } },
        ];
    }

    if (active !== undefined && active !== "all") {
        filter.active = active === "true";
    }

    if (city && mongoose.Types.ObjectId.isValid(city)) {
        filter.availableCities = city;
    }

    let limit = pageNum === 1 ? 30 : 10;
    let skip = pageNum === 1 ? 0 : 30 + (pageNum - 2) * 10;

    const totalCount = await ServiceCategory.countDocuments(filter);
    const categories = await ServiceCategory.find(filter)
        .populate("availableCities", "name slug active")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .exec();

    const hasMore = totalCount > skip + categories.length;

    return res.status(200).json(
        new ApiResponse(200, { categories, pagination: { page: pageNum, limit, totalCount, hasMore } }, "Service categories fetched successfully")
    );
});

// @desc    Get single service category by ID or slug
// @route   GET /api/v1/service-categories/:idOrSlug
// @access  Public
const getServiceCategoryByIdOrSlug = asyncHandler(async (req, res) => {
    const { idOrSlug } = req.params;

    const category = mongoose.Types.ObjectId.isValid(idOrSlug)
        ? await ServiceCategory.findById(idOrSlug).populate("availableCities", "name slug active")
        : await ServiceCategory.findOne({ slug: idOrSlug.toLowerCase() }).populate("availableCities", "name slug active");

    if (!category) throw new ApiError(404, "Service category not found");

    return res.status(200).json(new ApiResponse(200, category, "Service category fetched successfully"));
});

// @desc    Get available categories -> subcategories -> services nested navigation listing by city
// @route   GET /api/v1/service-categories/navigation/available
// @access  Public
const getAvailableNavigationByCity = asyncHandler(async (req, res) => {
    const { city } = req.query;

    if (!city || !mongoose.Types.ObjectId.isValid(city)) {
        throw new ApiError(400, "Valid City ObjectId parameter is required");
    }

    const cityId = new mongoose.Types.ObjectId(city);

    // 1. Fetch active categories in this city
    const categories = await ServiceCategory.find({
        active: true,
        availableCities: cityId
    }).lean();

    // 2. Fetch active subcategories in this city
    const subcategories = await ServiceSubcategory.find({
        active: true,
        availableCities: cityId
    }).lean();

    // 3. Fetch active services with configured pricing in this city
    const services = await Service.find({
        active: true,
        "cityPricing.city": cityId
    }).lean();

    const resultList = [];

    // Filter and map nested hierarchy
    for (const cat of categories) {
        const catSubcategories = [];

        // Find subcategories belonging to this category
        const matchedSubs = subcategories.filter(sub => 
            sub.categories.some(cid => cid.toString() === cat._id.toString())
        );

        for (const sub of matchedSubs) {
            // Check if there is at least one active service under this subcategory
            const hasService = services.some(srv => srv.subcategory.toString() === sub._id.toString());
            
            if (hasService) {
                catSubcategories.push(sub);
            }
        }

        // Only append category if it has at least one valid subcategory containing services
        if (catSubcategories.length > 0) {
            resultList.push({
                ...cat,
                subcategories: catSubcategories
            });
        }
    }

    return res.status(200).json(
        new ApiResponse(200, resultList, "Available services navigation structure retrieved successfully")
    );
});

export { 
    createServiceCategory, 
    updateServiceCategory, 
    deleteServiceCategory, 
    getServiceCategories, 
    getServiceCategoryByIdOrSlug,
    getAvailableNavigationByCity
};
