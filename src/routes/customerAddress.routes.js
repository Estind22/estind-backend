// src/routes/customerAddress.routes.js
import { Router } from "express";
import { authenticateCustomer } from "../middlewares/auth.middleware.js";
import {
    createAddress,
    getAddresses,
    updateAddress,
    deleteAddress
} from "../controllers/customerAddress.controller.js";

const router = Router();

// Protect all addresses management routes to customer profile context
router.use(authenticateCustomer);

router.post("/", createAddress);
router.get("/", getAddresses);
router.put("/:id", updateAddress);
router.delete("/:id", deleteAddress);

export default router;
