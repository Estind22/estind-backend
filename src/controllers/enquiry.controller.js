import { Enquiry } from "../models/enquiry.model.js";
import { Property } from "../models/property.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

// @desc    Customer: Submit a new Property Enquiry
// @route   POST /api/v1/enquiries
// @access  Private (Customer Auth)
export const createEnquiry = asyncHandler(async (req, res) => {
    const { propertyId, urgency, enquiryType, notes } = req.body;

    if (!propertyId || !urgency) {
        throw new ApiError(400, "Property context and urgency choice are required");
    }

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
        throw new ApiError(400, "Invalid Property ID");
    }

    const property = await Property.findById(propertyId);
    if (!property) {
        throw new ApiError(404, "Property listing not found");
    }

    const enquiry = await Enquiry.create({
        customer: req.customer._id,
        property: propertyId,
        keyman: property.keyman || null,
        city: property.city,
        urgency,
        enquiryType: enquiryType || "Enquiry",
        notes: notes || ""
    });

    await enquiry.populate([
        { path: "property", select: "title price listingType sectorType propertyType images" },
        { path: "city", select: "name" },
        { path: "keyman", select: "name phoneNo email" }
    ]);

    return res.status(201).json(
        new ApiResponse(201, enquiry, "Enquiry submitted successfully")
    );
});

// @desc    Customer: View my submitted enquiries list
// @route   GET /api/v1/enquiries/my-enquiries
// @access  Private (Customer Auth)
export const getCustomerEnquiries = asyncHandler(async (req, res) => {
    const enquiries = await Enquiry.find({ customer: req.customer._id })
        .sort({ createdAt: -1 })
        .populate([
            { path: "property", select: "title price listingType sectorType propertyType images" },
            { path: "city", select: "name" },
            { path: "keyman", select: "name phoneNo email" }
        ]);

    return res.status(200).json(
        new ApiResponse(200, enquiries, "Enquiries fetched successfully")
    );
});

// @desc    Admin/Keyman: Get all enquiries (filtered by status, search, and keyman role)
// @route   GET /api/v1/enquiries
// @access  Private (Staff Auth)
export const getAllEnquiries = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { status, searchQuery } = req.query;
    const filter = {};

    // Keyman scope validation: keymans only see enquiries mapped to them
    if (req.user.role === "keyman") {
        filter.keyman = req.user._id;
    }

    if (status !== undefined && status !== "") {
        filter.status = status;
    }

    // Dynamic populate definitions to perform name filtering matching
    const populateQuery = [
        { path: "customer", select: "name phone email" },
        { 
            path: "property", 
            select: "title price listingType propertyType locality",
            populate: { path: "locality", select: "name" }
        },
        { path: "city", select: "name" },
        { path: "keyman", select: "name phoneNo" }
    ];

    const totalCount = await Enquiry.countDocuments(filter);
    
    let enquiries = await Enquiry.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(populateQuery);

    // Apply client side or memory filtering if searchQuery is supplied (since we search nested populated fields)
    if (searchQuery && searchQuery.trim()) {
        const regex = new RegExp(searchQuery.trim(), "i");
        enquiries = enquiries.filter((e) => {
            const customerName = e.customer?.name || "";
            const customerPhone = e.customer?.phone || "";
            const propTitle = e.property?.title || "";
            return regex.test(customerName) || regex.test(customerPhone) || regex.test(propTitle);
        });
    }

    return res.status(200).json(
        new ApiResponse(200, {
            enquiries,
            totalCount,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        }, "Enquiries retrieved successfully")
    );
});

// @desc    Admin/Keyman: Update enquiry status details
// @route   PATCH /api/v1/enquiries/:id
// @access  Private (Staff Auth)
export const updateEnquiryStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid Enquiry ID");
    }

    const enquiry = await Enquiry.findById(id);
    if (!enquiry) {
        throw new ApiError(404, "Enquiry details not found");
    }

    // Role protection validation check
    if (req.user.role === "keyman" && enquiry.keyman?.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this enquiry");
    }

    enquiry.status = status;
    await enquiry.save();

    // If marked as booked, automatically update referenced property bookingStatus parameters
    if (status === "Booked") {
        await Property.findByIdAndUpdate(enquiry.property, {
            bookingStatus: "Booked"
        });
    }

    await enquiry.populate([
        { path: "customer", select: "name phone email" },
        { 
            path: "property", 
            select: "title price listingType propertyType locality",
            populate: { path: "locality", select: "name" }
        },
        { path: "city", select: "name" },
        { path: "keyman", select: "name phoneNo" }
    ]);

    return res.status(200).json(
        new ApiResponse(200, enquiry, "Enquiry status updated successfully")
    );
});
