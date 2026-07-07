import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
    createCategory,
    deleteCategory,
    editCategory,
    getAllCategories,
    getAllCategorySlugs,
    getCategoryById,
    getCategoryBySlug
} from "../controllers/category.controller.js";

const router = Router();

// Category Routes
router.route("/createCategory").post(authenticate, createCategory);
router.route("/:_id").put(authenticate, editCategory);
router.route("/:_id").delete(authenticate, deleteCategory);
router.route("/slugs").get(getAllCategorySlugs);
router.route("/").get(getAllCategories);
router.route("/view/:_id").get(authenticate, getCategoryById);
router.route("/details/:slug").get(getCategoryBySlug);

export default router;