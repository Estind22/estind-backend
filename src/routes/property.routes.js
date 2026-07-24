import { Router } from "express";
import { authenticate, authenticateCustomer } from "../middlewares/auth.middleware.js";
import {
    createProperty,
    getAllProperties,
    getPropertyDetails,
    updateProperty,
    deleteProperty,
    createPublicProperty
} from "../controllers/property.controller.js";

const router = Router();

// Public routes
router.get("/", getAllProperties);
router.get("/:key", getPropertyDetails);

// Customer protected route
router.post("/public-register", authenticateCustomer, createPublicProperty);

// Admin protected routes
router.post("/", authenticate, createProperty);
router.put("/:id", authenticate, updateProperty);
router.delete("/:id", authenticate, deleteProperty);

export default router;
