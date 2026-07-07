import { Group } from "../models/group.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

// @desc    Create a new Group configuration
// @route   POST /api/v1/groups
// @access  Private (Admin)
const createGroup = asyncHandler(async (req, res) => {
    const {
        title, description, city, groupType, backgroundColor, layoutType,
        properties, projects, localities, active, sequence
    } = req.body;

    if (!title || !city || !groupType) {
        throw new ApiError(400, "Title, City, and Group Type classification are required fields");
    }

    const group = await Group.create({
        title,
        description: description || "",
        city,
        groupType,
        backgroundColor: backgroundColor || "#ffffff",
        layoutType: layoutType || "scroll",
        properties: properties || [],
        projects: projects || [],
        localities: localities || [],
        active: active !== undefined ? active : true,
        sequence: sequence !== undefined ? sequence : 0
    });

    await group.populate([
        { path: "city", select: "name slug" },
        { path: "properties", select: "title price listingType sectorType propertyType images" },
        { path: "projects", select: "name developer constructionStatus images" },
        { path: "localities", select: "name slug" }
    ]);

    return res.status(201).json(
        new ApiResponse(201, group, "Property group created successfully")
    );
});

// @desc    Get all Groups (filtered by City and optionally status, paginated)
// @route   GET /api/v1/groups
// @access  Public
const getAllGroups = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { city, active } = req.query;
    const query = {};

    if (city) {
        query.city = city;
    }
    if (active !== undefined && active !== "") {
        query.active = active === "true";
    }

    const totalCount = await Group.countDocuments(query);
    const groups = await Group.find(query)
        .sort({ sequence: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate([
            { path: "city", select: "name slug" },
            { 
                path: "properties", 
                populate: [
                    { path: "city", select: "name slug" },
                    { path: "locality", select: "name slug" }
                ]
            },
            { 
                path: "projects",
                populate: [
                    { path: "city", select: "name" },
                    { path: "locality", select: "name" }
                ]
            },
            { path: "localities", select: "name slug" }
        ]);

    return res.status(200).json(
        new ApiResponse(200, {
            groups,
            totalCount,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        }, "Groups fetched successfully")
    );
});

// @desc    Get specific Group details
// @route   GET /api/v1/groups/:id
// @access  Public
const getGroupDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid Group ID");
    }

    const group = await Group.findById(id).populate([
        { path: "city", select: "name slug" },
        { path: "properties" },
        { path: "projects" },
        { path: "localities" }
    ]);

    if (!group) {
        throw new ApiError(404, "Group not found");
    }

    return res.status(200).json(
        new ApiResponse(200, group, "Group details fetched successfully")
    );
});

// @desc    Update an existing Group details
// @route   PUT /api/v1/groups/:id
// @access  Private (Admin)
const updateGroup = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid Group ID");
    }

    const group = await Group.findById(id);
    if (!group) {
        throw new ApiError(404, "Group not found");
    }

    Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
            group[key] = updateData[key];
        }
    });

    await group.save();

    await group.populate([
        { path: "city", select: "name slug" },
        { 
            path: "properties", 
            populate: [
                { path: "city", select: "name slug" },
                { path: "locality", select: "name slug" }
            ]
        },
        { 
            path: "projects",
            populate: [
                { path: "city", select: "name" },
                { path: "locality", select: "name" }
            ]
        },
        { path: "localities", select: "name slug" }
    ]);

    return res.status(200).json(
        new ApiResponse(200, group, "Group details updated successfully")
    );
});

// @desc    Delete a specific Group
// @route   DELETE /api/v1/groups/:id
// @access  Private (Admin)
const deleteGroup = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid Group ID");
    }

    const deleted = await Group.findByIdAndDelete(id);
    if (!deleted) {
        throw new ApiError(404, "Group not found");
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Group configuration deleted successfully")
    );
});

// @desc    Admin: Bulk reorder groups sequence
// @route   PUT /api/v1/groups/reorder/bulk
// @access  Private (Admin)
const reorderGroups = asyncHandler(async (req, res) => {
    const { order } = req.body; // Array of objects: [{ id, sequence }]

    if (!Array.isArray(order)) {
        throw new ApiError(400, "Ordering parameter must be an array of updates");
    }

    const bulkOps = order.map((item) => ({
        updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(item.id) },
            update: { $set: { sequence: item.sequence } }
        }
    }));

    await Group.bulkWrite(bulkOps);

    return res.status(200).json(
        new ApiResponse(200, null, "Groups sequence updated successfully")
    );
});

export {
    createGroup,
    getAllGroups,
    getGroupDetails,
    updateGroup,
    deleteGroup,
    reorderGroups
};
