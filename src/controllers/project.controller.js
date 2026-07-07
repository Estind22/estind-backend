import { Project } from "../models/project.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

// @desc    Create a new Project
// @route   POST /api/v1/projects
// @access  Private (Admin)
const createProject = asyncHandler(async (req, res) => {
    const { name, slug, developer, locality, city, constructionStatus, amenities, images, description, active } = req.body;

    if (!name || !slug || !locality || !city) {
        throw new ApiError(400, "Name, slug, city and locality are required fields");
    }

    const project = await Project.create({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
        developer,
        locality,
        city,
        constructionStatus,
        amenities,
        images,
        description,
        active: active !== undefined ? active : true
    });

    await project.populate([
        { path: "city", select: "name slug" },
        { path: "locality", select: "name slug" }
    ]);

    return res.status(201).json(
        new ApiResponse(201, project, "Project created successfully")
    );
});

// @desc    Get all projects (paginated with filters)
// @route   GET /api/v1/projects
// @access  Public
const getAllProjects = asyncHandler(async (req, res) => {
    const { city, locality, search, page = 1, limit = 10, active } = req.query;
    const filter = {};

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skipNum = (pageNum - 1) * limitNum;

    if (city && mongoose.Types.ObjectId.isValid(city)) {
        filter.city = city;
    }
    if (locality && mongoose.Types.ObjectId.isValid(locality)) {
        filter.locality = locality;
    }
    if (active !== undefined) {
        filter.active = active === "true";
    }

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { developer: { $regex: search, $options: "i" } }
        ];
    }

    const totalCount = await Project.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limitNum);

    const projects = await Project.find(filter)
        .populate([
            { path: "city", select: "name slug" },
            { path: "locality", select: "name slug" }
        ])
        .sort({ name: 1 })
        .skip(skipNum)
        .limit(limitNum);

    return res.status(200).json(
        new ApiResponse(200, {
            projects,
            totalCount,
            totalPages,
            currentPage: pageNum,
            limit: limitNum
        }, "Projects list fetched successfully")
    );
});

// @desc    Get Project details by ID or Slug
// @route   GET /api/v1/projects/:key
// @access  Public
const getProjectDetails = asyncHandler(async (req, res) => {
    const { key } = req.params;

    const query = mongoose.Types.ObjectId.isValid(key)
        ? { _id: key }
        : { slug: key };

    const project = await Project.findOne(query).populate([
        { path: "city", select: "name slug" },
        { path: "locality", select: "name slug" }
    ]);

    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    return res.status(200).json(
        new ApiResponse(200, project, "Project details fetched successfully")
    );
});

// @desc    Update a Project
// @route   PUT /api/v1/projects/:id
// @access  Private (Admin)
const updateProject = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid Project ID");
    }

    const project = await Project.findById(id);
    if (!project) {
        throw new ApiError(404, "Project not found");
    }

    // Assign parameters safely
    Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
            if (key === "slug") {
                project.slug = updateData[key].toLowerCase().replace(/[^a-z0-9-]+/g, "-");
            } else {
                project[key] = updateData[key];
            }
        }
    });

    await project.save();
    
    await project.populate([
        { path: "city", select: "name slug" },
        { path: "locality", select: "name slug" }
    ]);

    return res.status(200).json(
        new ApiResponse(200, project, "Project details updated successfully")
    );
});

// @desc    Delete a Project
// @route   DELETE /api/v1/projects/:id
// @access  Private (Admin)
const deleteProject = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid Project ID");
    }

    const deleted = await Project.findByIdAndDelete(id);
    if (!deleted) {
        throw new ApiError(404, "Project not found");
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Project deleted successfully")
    );
});

export {
    createProject,
    getAllProjects,
    getProjectDetails,
    updateProject,
    deleteProject
};
