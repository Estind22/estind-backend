import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
    createLocality,
    getAllLocalities,
    getLocalityById,
    updateLocality,
    deleteLocality
} from "../controllers/locality.controller.js";

const router = Router();

// Public routes
router.get("/", getAllLocalities);
router.get("/:id", getLocalityById);

// Admin-only protected routes
router.post("/", authenticate, createLocality);
router.put("/:id", authenticate, updateLocality);
router.delete("/:id", authenticate, deleteLocality);

export default router;
