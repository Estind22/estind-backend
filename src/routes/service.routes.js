// src/routes/service.routes.js
import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { createService, updateService, deleteService, getServices, getServiceByIdOrSlug, getServiceHierarchyForCity } from "../controllers/service.controller.js";

const router = Router();

router.get("/", getServices);
router.get("/hierarchy", getServiceHierarchyForCity);
router.get("/:idOrSlug", getServiceByIdOrSlug);
router.post("/", authenticate, createService);
router.put("/:id", authenticate, updateService);
router.delete("/:id", authenticate, deleteService);

export default router;
