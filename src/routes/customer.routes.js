// src/routes/customer.routes.js
import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authenticateCustomer } from "../middlewares/auth.middleware.js";
import {
    requestOtp,
    verifyOtp,
    getCustomerProfile,
    updateCustomerProfile,
    deleteCustomerProfile,
    getAllCustomers,
    adminDeleteCustomer,
    adminUpdateCustomer
} from "../controllers/customer.controller.js";

const router = Router();

// Public auth endpoints
router.post("/otp/request", requestOtp);
router.post("/otp/verify", verifyOtp);

// Customer protected profile endpoints
router.get("/profile", authenticateCustomer, getCustomerProfile);
router.put("/profile", authenticateCustomer, updateCustomerProfile);
router.delete("/profile", authenticateCustomer, deleteCustomerProfile);

// Admin protected endpoints (uses main dashboard staff auth)
router.get("/", authenticate, getAllCustomers);
router.put("/:id", authenticate, adminUpdateCustomer);
router.delete("/:id", authenticate, adminDeleteCustomer);

export default router;
