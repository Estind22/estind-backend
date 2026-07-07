import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
    createProject,
    getAllProjects,
    getProjectDetails,
    updateProject,
    deleteProject
} from "../controllers/project.controller.js";

const router = Router();

// Public routes
router.get("/", getAllProjects);
router.get("/:key", getProjectDetails);

// Admin protected routes
router.post("/", authenticate, createProject);
router.put("/:id", authenticate, updateProject);
router.delete("/:id", authenticate, deleteProject);

export default router;
