// src/routes/serviceCategory.routes.js
import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { createServiceCategory, updateServiceCategory, deleteServiceCategory, getServiceCategories, getServiceCategoryByIdOrSlug } from "../controllers/serviceCategory.controller.js";

const router = Router();

router.get("/", getServiceCategories);
router.get("/:idOrSlug", getServiceCategoryByIdOrSlug);
router.post("/", authenticate, createServiceCategory);
router.put("/:id", authenticate, updateServiceCategory);
router.delete("/:id", authenticate, deleteServiceCategory);

export default router;
