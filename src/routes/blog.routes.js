import { Router } from "express";
import { authenticate, authorizeRoles, authorizeSystemRoles } from "../middlewares/auth.middleware.js";
import {
    createBlog,
    updateBlog,
    deleteBlog,
    getBlogBySlug,
    getBlogById,
    getAllBlogSlugs,
    getBlogsPaged,
    getLatestBlogs
} from "../controllers/blog.controller.js";

const router = Router();

// Blog routes
router.route("/create").post(authenticate, createBlog);
router.route("/latest").get(getLatestBlogs);
router.route("/slugs").get(getAllBlogSlugs);
router.route("/slug/:slug").get(getBlogBySlug);
router.route("/view/:_id").get(getBlogById);
router.route("/").get(getBlogsPaged);
router.route("/:_id").put(authenticate, updateBlog);
router.route("/:_id").delete(authenticate, deleteBlog);

export default router;
