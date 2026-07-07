import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
    createGroup,
    getAllGroups,
    getGroupDetails,
    updateGroup,
    deleteGroup,
    reorderGroups
} from "../controllers/group.controller.js";

const router = Router();

// Public routes for website home screen query resolution
router.get("/", getAllGroups);
router.get("/:id", getGroupDetails);

// Admin-only management endpoints
router.post("/", authenticate, createGroup);
router.put("/reorder/bulk", authenticate, reorderGroups);
router.put("/:id", authenticate, updateGroup);
router.delete("/:id", authenticate, deleteGroup);

export default router;
