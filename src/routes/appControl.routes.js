import { Router } from "express";
import { getAppControls, updateAppControls } from "../controllers/appControl.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();

// Public route for mobile apps to fetch config
router.route("/").get(getAppControls);

// Protected route for super admin to update config
router.route("/").put(authenticate, authorizeRoles("admin"), updateAppControls);

export default router;
