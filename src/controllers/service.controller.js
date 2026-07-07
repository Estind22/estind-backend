// src/controllers/service.controller.js
import mongoose from "mongoose";
import { Service } from "../models/service.model.js";
import { ServiceCategory } from "../models/serviceCategory.model.js";
import { ServiceSubcategory } from "../models/serviceSubcategory.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Create a service
// @route   POST /api/v1/services
// @access  Private (Admin)
const createService = asyncHandler(async (req, res) => {
    const { name, slug, image, details, subcategory, category, basePrice, cityPricing, active } = req.body;

    if (!name || !slug || !subcategory || !category) {
        throw new ApiError(400, "Name, slug, subcategory, and category are required");
    }

    if (!mongoose.Types.ObjectId.isValid(subcategory)) throw new ApiError(400, "Invalid subcategory ID");
    if (!mongoose.Types.ObjectId.isValid(category)) throw new ApiError(400, "Invalid category ID");

    const existing = await Service.findOne({ slug: slug.toLowerCase() });
    if (existing) throw new ApiError(400, "A service with this slug already exists");

    const service = await Service.create({
        name: name.trim(),
        slug: slug.toLowerCase().trim(),
        image: image || "",
        details: details || "",
        subcategory,
        category,
        basePrice: basePrice || 0,
        cityPricing: cityPricing || [],
        active: active !== undefined ? active : true,
    });

    await service.populate([
        { path: "category", select: "name slug" },
        { path: "subcategory", select: "name slug" },
        { path: "cityPricing.city", select: "name slug" },
    ]);

    return res.status(201).json(new ApiResponse(201, service, "Service created successfully"));
});

// @desc    Update a service
// @route   PUT /api/v1/services/:id
// @access  Private (Admin)
const updateService = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, slug, image, details, subcategory, category, basePrice, cityPricing, active } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid service ID");

    const service = await Service.findById(id);
    if (!service) throw new ApiError(404, "Service not found");

    if (slug && slug !== service.slug) {
        const existing = await Service.findOne({ slug: slug.toLowerCase(), _id: { $ne: id } });
        if (existing) throw new ApiError(400, "A service with this slug already exists");
        service.slug = slug.toLowerCase().trim();
    }

    if (name !== undefined) service.name = name.trim();
    if (image !== undefined) service.image = image;
    if (details !== undefined) service.details = details;
    if (basePrice !== undefined) service.basePrice = basePrice;
    if (cityPricing !== undefined) service.cityPricing = cityPricing;
    if (active !== undefined) service.active = active;

    if (subcategory !== undefined) {
        if (!mongoose.Types.ObjectId.isValid(subcategory)) throw new ApiError(400, "Invalid subcategory ID");
        service.subcategory = subcategory;
    }

    if (category !== undefined) {
        if (!mongoose.Types.ObjectId.isValid(category)) throw new ApiError(400, "Invalid category ID");
        service.category = category;
    }

    await service.save();
    await service.populate([
        { path: "category", select: "name slug" },
        { path: "subcategory", select: "name slug" },
        { path: "cityPricing.city", select: "name slug" },
    ]);

    return res.status(200).json(new ApiResponse(200, service, "Service updated successfully"));
});

// @desc    Delete a service
// @route   DELETE /api/v1/services/:id
// @access  Private (Admin)
const deleteService = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid service ID");

    const service = await Service.findByIdAndDelete(id);
    if (!service) throw new ApiError(404, "Service not found");

    return res.status(200).json(new ApiResponse(200, null, "Service deleted successfully"));
});

// @desc    Get all services with pagination and filters
// @route   GET /api/v1/services?page=1&search=&category=&subcategory=&active=&city=
// @access  Public / Admin
const getServices = asyncHandler(async (req, res) => {
    const { page = 1, search, category, subcategory, active, city } = req.query;

    const pageNum = parseInt(page) || 1;
    const filter = {};

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { slug: { $regex: search, $options: "i" } },
            { details: { $regex: search, $options: "i" } },
        ];
    }

    if (category && mongoose.Types.ObjectId.isValid(category)) {
        filter.category = category;
    }

    if (subcategory && mongoose.Types.ObjectId.isValid(subcategory)) {
        filter.subcategory = subcategory;
    }

    // Filter services available in a city (city has a pricing entry)
    if (city && mongoose.Types.ObjectId.isValid(city)) {
        filter["cityPricing.city"] = city;
    }

    if (active !== undefined && active !== "all") {
        filter.active = active === "true";
    }

    let limit = pageNum === 1 ? 30 : 10;
    let skip = pageNum === 1 ? 0 : 30 + (pageNum - 2) * 10;

    const totalCount = await Service.countDocuments(filter);
    const services = await Service.find(filter)
        .populate("category", "name slug")
        .populate("subcategory", "name slug")
        .populate("cityPricing.city", "name slug")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .exec();

    const mappedServices = services.map((service) => {
        const serviceObj = service.toObject();
        if (city && mongoose.Types.ObjectId.isValid(city)) {
            const cityPriceObj = serviceObj.cityPricing.find(
                (cp) => (cp.city?._id || cp.city).toString() === city.toString()
            );
            serviceObj.resolvedPrice = cityPriceObj ? cityPriceObj.price : serviceObj.basePrice;
        } else {
            serviceObj.resolvedPrice = serviceObj.basePrice;
        }
        return serviceObj;
    });

    const hasMore = totalCount > skip + services.length;

    return res.status(200).json(
        new ApiResponse(200, { services: mappedServices, pagination: { page: pageNum, limit, totalCount, hasMore } }, "Services fetched successfully")
    );
});

// @desc    Get single service by ID or slug
// @route   GET /api/v1/services/:idOrSlug
// @access  Public
const getServiceByIdOrSlug = asyncHandler(async (req, res) => {
    const { idOrSlug } = req.params;

    const service = mongoose.Types.ObjectId.isValid(idOrSlug)
        ? await Service.findById(idOrSlug)
            .populate("category", "name slug")
            .populate("subcategory", "name slug")
            .populate("cityPricing.city", "name slug")
        : await Service.findOne({ slug: idOrSlug.toLowerCase() })
            .populate("category", "name slug")
            .populate("subcategory", "name slug")
            .populate("cityPricing.city", "name slug");

    if (!service) throw new ApiError(404, "Service not found");

    return res.status(200).json(new ApiResponse(200, service, "Service fetched successfully"));
});

// @desc    Get nested categories and subcategories based on city availability & package presence rules
// @route   GET /api/v1/services/hierarchy?city=
// @access  Public
const getServiceHierarchyForCity = asyncHandler(async (req, res) => {
    const { city } = req.query;

    if (!city || !mongoose.Types.ObjectId.isValid(city)) {
        throw new ApiError(400, "Valid city ID parameter is required");
    }

    const cityId = new mongoose.Types.ObjectId(city);

    // 1. Get all active services with at least one pricing item matching the requested city
    const activeServices = await Service.find({
        active: true,
        "cityPricing.city": cityId
    });

    if (activeServices.length === 0) {
        return res.status(200).json(new ApiResponse(200, [], "No active services found in this city"));
    }

    // Extract unique subcategory and category object IDs present in those services
    const subcategoryIds = [...new Set(activeServices.map(s => s.subcategory.toString()))];
    const categoryIds = [...new Set(activeServices.map(s => s.category.toString()))];

    // 2. Fetch active subcategories linked to these services and available in this city
    const subcategories = await ServiceSubcategory.find({
        _id: { $in: subcategoryIds },
        active: true,
        availableCities: cityId
    });

    // 3. Fetch active categories linked to these subcategories and available in this city
    const categories = await ServiceCategory.find({
        _id: { $in: categoryIds },
        active: true,
        availableCities: cityId
    });

    // 4. Build hierarchy nesting subcategories under categories
    const hierarchy = categories.map(cat => {
        const matchingSubcategories = subcategories.filter(sub => 
            sub.categories.some(c => c.toString() === cat._id.toString())
        );

        return {
            _id: cat._id,
            name: cat.name,
            slug: cat.slug,
            image: cat.image,
            active: cat.active,
            availableCities: cat.availableCities,
            subcategories: matchingSubcategories
        };
    }).filter(cat => cat.subcategories.length > 0); // Rule 3: Category must contain valid subcategories to show

    return res.status(200).json(
        new ApiResponse(200, hierarchy, "Service hierarchy fetched successfully")
    );
});

export { 
    createService, 
    updateService, 
    deleteService, 
    getServices, 
    getServiceByIdOrSlug,
    getServiceHierarchyForCity 
};
