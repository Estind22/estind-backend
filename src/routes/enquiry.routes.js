import { Router } from "express";
import { authenticate, authenticateCustomer } from "../middlewares/auth.middleware.js";
import {
    createEnquiry,
    getCustomerEnquiries,
    getAllEnquiries,
    updateEnquiryStatus
} from "../controllers/enquiry.controller.js";

const router = Router();

// Customer endpoints
router.post("/", authenticateCustomer, createEnquiry);
router.get("/my-enquiries", authenticateCustomer, getCustomerEnquiries);

// Staff/Admin management endpoints
router.get("/", authenticate, getAllEnquiries);
router.patch("/:id", authenticate, updateEnquiryStatus);

export default router;
