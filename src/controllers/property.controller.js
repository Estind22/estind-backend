import { Property } from "../models/property.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

// @desc    Create a new Property
// @route   POST /api/v1/properties
// @access  Private (Admin)
const createProperty = asyncHandler(async (req, res) => {
    const {
        title, slug, city, locality, project, keyman, listingType, sectorType, propertyType,
        price, tokenAmount, deposit, bhk, bathrooms, floor, furnishingStatus,
        areaValue, areaUnit, facing, parking, bookingStatus, active, description,
        amenities, images
    } = req.body;

    if (!title || !slug || !city || !locality || !listingType || !sectorType || !propertyType || !price || !areaValue) {
        throw new ApiError(400, "All primary details (title, slug, city, locality, listingType, sectorType, propertyType, price, and area dimensions) are required");
    }

    const property = await Property.create({
        title,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
        city,
        locality,
        project: project ? project : null,
        keyman: keyman ? keyman : null,
        listingType,
        sectorType,
        propertyType,
        price,
        tokenAmount: tokenAmount || 0,
        deposit: deposit || "",
        bhk: bhk || null,
        bathrooms: bathrooms || null,
        floor: floor || null,
        furnishingStatus: furnishingStatus || "",
        areaValue,
        areaUnit,
        facing: facing || "",
        parking: parking || 0,
        bookingStatus: bookingStatus || "Available",
        active: active !== undefined ? active : true,
        description: description || "",
        amenities: amenities || [],
        images: images || []
    });

    await property.populate([
        { path: "city", select: "name slug" },
        { path: "locality", select: "name slug" },
        { path: "project", select: "name developer" },
        { path: "keyman", select: "name uniqueId phoneNo email" }
    ]);

    return res.status(201).json(
        new ApiResponse(201, property, "Property registered successfully")
    );
});

// @desc    Get all properties (paginated with complex filters)
// @route   GET /api/v1/properties
// @access  Public
const getAllProperties = asyncHandler(async (req, res) => {
    const {
        city, locality, project, listingType, sectorType, propertyType,
        minPrice, maxPrice, bhk, furnishingStatus, search, bookingStatus,
        page = 1, limit = 10, active
    } = req.query;

    const filter = {};
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skipNum = (pageNum - 1) * limitNum;

    // String matches
    if (listingType) filter.listingType = listingType;
    if (sectorType) filter.sectorType = sectorType;
    if (propertyType) filter.propertyType = propertyType;
    if (furnishingStatus) filter.furnishingStatus = furnishingStatus;
    if (bookingStatus) filter.bookingStatus = bookingStatus;
    
    if (active !== undefined) {
        filter.active = active === "true";
    }

    // References
    if (city && mongoose.Types.ObjectId.isValid(city)) {
        filter.city = city;
    }
    if (locality && mongoose.Types.ObjectId.isValid(locality)) {
        filter.locality = locality;
    }
    if (project && mongoose.Types.ObjectId.isValid(project)) {
        filter.project = project;
    }

    // Number parameters
    if (bhk) {
        filter.bhk = parseInt(bhk, 10);
    }

    // Budget Price boundaries
    if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Search query titles
    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } }
        ];
    }

    const totalCount = await Property.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limitNum);

    const properties = await Property.find(filter)
        .populate([
            { path: "city", select: "name slug" },
            { path: "locality", select: "name slug" },
            { path: "project", select: "name developer" },
            { path: "keyman", select: "name uniqueId phoneNo email" }
        ])
        .sort({ createdAt: -1 })
        .skip(skipNum)
        .limit(limitNum);

    return res.status(200).json(
        new ApiResponse(200, {
            properties,
            totalCount,
            totalPages,
            currentPage: pageNum,
            limit: limitNum
        }, "Properties fetched successfully")
    );
});

// @desc    Get Property details by ID or Slug
// @route   GET /api/v1/properties/:key
// @access  Public
const getPropertyDetails = asyncHandler(async (req, res) => {
    const { key } = req.params;
    let querySlug = key;

    if (key && key.includes("-for-")) {
        querySlug = key.split("-for-")[0];
    }

    const query = mongoose.Types.ObjectId.isValid(key)
        ? { _id: key }
        : { slug: querySlug };

    const property = await Property.findOne(query).populate([
        { path: "city", select: "name slug" },
        { path: "locality", select: "name slug" },
        { path: "project", select: "name developer constructionStatus description amenities" },
        { path: "keyman", select: "name uniqueId phoneNo email" }
    ]);

    if (!property) {
        throw new ApiError(404, "Property details not found");
    }

    return res.status(200).json(
        new ApiResponse(200, property, "Property details fetched successfully")
    );
});

// @desc    Update a Property
// @route   PUT /api/v1/properties/:id
// @access  Private (Admin)
const updateProperty = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid Property ID");
    }

    const property = await Property.findById(id);
    if (!property) {
        throw new ApiError(404, "Property details not found");
    }

    // Set parameters
    Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
            if (key === "slug") {
                property.slug = updateData[key].toLowerCase().replace(/[^a-z0-9-]+/g, "-");
            } else if (key === "project") {
                property.project = updateData[key] ? updateData[key] : null;
            } else if (key === "keyman") {
                property.keyman = updateData[key] ? updateData[key] : null;
            } else {
                property[key] = updateData[key];
            }
        }
    });

    await property.save();

    await property.populate([
        { path: "city", select: "name slug" },
        { path: "locality", select: "name slug" },
        { path: "project", select: "name developer" },
        { path: "keyman", select: "name uniqueId phoneNo email" }
    ]);

    return res.status(200).json(
        new ApiResponse(200, property, "Property details updated successfully")
    );
});

// @desc    Delete a Property
// @route   DELETE /api/v1/properties/:id
// @access  Private (Admin)
const deleteProperty = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid Property ID");
    }

    const deleted = await Property.findByIdAndDelete(id);
    if (!deleted) {
        throw new ApiError(404, "Property not found");
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Property deleted successfully")
    );
});

export {
    createProperty,
    getAllProperties,
    getPropertyDetails,
    updateProperty,
    deleteProperty
};
