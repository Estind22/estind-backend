// src/routes/serviceSubcategory.routes.js
import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { createServiceSubcategory, updateServiceSubcategory, deleteServiceSubcategory, getServiceSubcategories, getServiceSubcategoryByIdOrSlug } from "../controllers/serviceSubcategory.controller.js";

const router = Router();

router.get("/", getServiceSubcategories);
router.get("/:idOrSlug", getServiceSubcategoryByIdOrSlug);
router.post("/", authenticate, createServiceSubcategory);
router.put("/:id", authenticate, updateServiceSubcategory);
router.delete("/:id", authenticate, deleteServiceSubcategory);

export default router;
