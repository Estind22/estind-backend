import { Category } from "../models/category.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Parent Category
const createCategory = asyncHandler(async (req, res) => {
    const { name, slug, active, image } = req.body;

    if (!name || !slug) {
        throw new ApiError(400, "Details not found");
    }

    const newCategory = await Category.create({
        name,
        slug,
        image: image ? image : "",
        active
    });

    if (!newCategory) {
        throw new ApiError(409, "Could not create category");
    }

    return res.status(201).json(
        new ApiResponse(201, newCategory, "Category created Successfully")
    );
});

const editCategory = asyncHandler(async (req, res) => {
    const { _id } = req.params;
    const { name, slug, active, image } = req.body;

    if (!_id || !name || !slug) {
        throw new ApiError(400, "Details not found");
    }

    const foundCategory = await Category.findById(_id);
    if (!foundCategory) {
        throw new ApiError(409, `Category not found`);
    }

    const updatedCategory = await Category.findByIdAndUpdate(
        { _id },
        {
            name,
            slug,
            active,
            image: image ? image : foundCategory?.image
        },
        { new: true }
    ).exec();

    if (!updatedCategory) {
        throw new ApiError(409, "Could not update category");
    }

    return res.status(200).json(
        new ApiResponse(200, updatedCategory, "Category updated Successfully")
    );
});

const deleteCategory = asyncHandler(async (req, res) => {
    const { _id } = req.params;

    if (!_id) {
        throw new ApiError(400, "Details not found");
    }

    const foundCategory = await Category.findById(_id);
    if (!foundCategory) {
        throw new ApiError(409, `Category not found`);
    }

    const deletedCategory = await Category.findByIdAndDelete(_id);

    if (!deletedCategory) {
        throw new ApiError(409, "Could not delete category");
    }

    return res.status(200).json(
        new ApiResponse(200, deletedCategory, "Category deleted Successfully")
    );
});

const getAllCategorySlugs = asyncHandler(async (req, res) => {
    const allCategories = await Category.find({ active: true })
        .select("-_id slug updatedAt").exec();

    if (!allCategories) {
        throw new ApiError(409, "Could not find categories");
    }

    return res.status(200).json(
        new ApiResponse(200, allCategories, "Category slugs fetched Successfully")
    );
});

const getAllCategories = asyncHandler(async (req, res) => {
    const allCategories = await Category.find({}).exec();

    if (!allCategories) {
        throw new ApiError(409, "Could not find categories");
    }

    return res.status(200).json(
        new ApiResponse(200, allCategories, "Categories fetched Successfully")
    );
});

const getCategoryById = asyncHandler(async (req, res) => {
    const completeCatgeoryDetails = await Category.findById(req?.params?._id).exec();

    if (!completeCatgeoryDetails) {
        throw new ApiError(409, "Could not fetch category details");
    }

    return res.status(200).json(
        new ApiResponse(200, completeCatgeoryDetails, "Category details fetched Successfully")
    );
});

const getCategoryBySlug = asyncHandler(async (req, res) => {
    const completeCatgeoryDetails = await Category.findOne({
        slug: req?.params?.slug
    }).exec();

    if (!completeCatgeoryDetails) {
        throw new ApiError(409, "Could not fetch category details");
    }

    return res.status(200).json(
        new ApiResponse(200, completeCatgeoryDetails, "Category details fetched Successfully")
    );
});

export {
    createCategory,
    editCategory,
    deleteCategory,
    getAllCategorySlugs,
    getAllCategories,
    getCategoryById,
    getCategoryBySlug
};