import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
    createProperty,
    getAllProperties,
    getPropertyDetails,
    updateProperty,
    deleteProperty
} from "../controllers/property.controller.js";

const router = Router();

// Public routes
router.get("/", getAllProperties);
router.get("/:key", getPropertyDetails);

// Admin protected routes
router.post("/", authenticate, createProperty);
router.put("/:id", authenticate, updateProperty);
router.delete("/:id", authenticate, deleteProperty);

export default router;
