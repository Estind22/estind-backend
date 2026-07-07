// src/routes/serviceOrder.routes.js
import { Router } from "express";
import { authenticate, authenticateCustomer } from "../middlewares/auth.middleware.js";
import {
    createServiceOrder,
    getServiceOrderDetails,
    getCustomerServiceOrders,
    adminGetAllOrders,
    adminUpdateOrderStatus
} from "../controllers/serviceOrder.controller.js";

const router = Router();

// Customer facing order booking endpoints
router.post("/", authenticateCustomer, createServiceOrder);
router.get("/my-bookings", authenticateCustomer, getCustomerServiceOrders);
router.get("/details/:id", authenticateCustomer, getServiceOrderDetails);

// Admin/Staff facing management endpoints (uses staff admin token verification)
router.get("/admin/all", authenticate, adminGetAllOrders);
router.put("/admin/update/:id", authenticate, adminUpdateOrderStatus);

export default router;
