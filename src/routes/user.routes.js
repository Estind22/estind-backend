// src/routes/user.routes.js
import express from "express";
import {
    createUser,
    updateUser,
    deleteUser,
    listUsers,
    getMyProfile,
    updatePassword,
    getUserActiveSessions
} from "../controllers/user.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// List all users (Admin or employees)
router.get("/list", authenticate, listUsers);

// Get currently logged-in user profile
router.get("/myProfile", authenticate, getMyProfile);

// Update password
router.patch("/update-password", authenticate, updatePassword);

// Get user active sessions
router.get("/:id/activeSessions", authenticate, getUserActiveSessions);

// Create user (Admin only)
router.post("/create", authenticate, createUser);

// Update user (Admin only)
router.patch("/update/:id", authenticate, updateUser);

// Delete user (Admin only)
router.delete("/delete/:id", authenticate, authorizeRoles("admin"), deleteUser);

export default router;