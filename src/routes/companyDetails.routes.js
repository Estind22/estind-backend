import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { getCompanyDetails, updateCompanyDetails } from "../controllers/companyDetails.controller.js";

const router = Router();

// Public route to view company details
router.get("/", getCompanyDetails);

// Admin-only route to update details
router.post("/", authenticate, updateCompanyDetails);

export default router;
