// src/controllers/serviceOrder.controller.js
import { ServiceOrder } from "../models/serviceOrder.model.js";
import { Service } from "../models/service.model.js";
import { CustomerAddress } from "../models/customerAddress.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

// Helper to generate a unique random order ID e.g., EST-SRV-4739184
const generateUniqueOrderId = async () => {
    let orderId = "";
    let exists = true;
    while (exists) {
        const rand = Math.floor(1000000 + Math.random() * 9000000);
        orderId = `EST-SRV-${rand}`;
        const match = await ServiceOrder.findOne({ orderId });
        if (!match) exists = false;
    }
    return orderId;
};

// @desc    Create / Book a service order
// @route   POST /api/v1/orders/services
// @access  Private (Customer)
const createServiceOrder = asyncHandler(async (req, res) => {
    const { items, addressId, cityId } = req.body;
    const customerId = req.customer._id;

    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, "Order must contain at least one service item");
    }
    if (!addressId || !mongoose.Types.ObjectId.isValid(addressId)) {
        throw new ApiError(400, "Valid delivery address ID is required");
    }
    if (!cityId || !mongoose.Types.ObjectId.isValid(cityId)) {
        throw new ApiError(400, "Valid City ID is required");
    }

    // 1. Verify and retrieve customer address
    const address = await CustomerAddress.findOne({ _id: addressId, customer: customerId });
    if (!address) {
        throw new ApiError(404, "Selected service address not found");
    }

    // 2. Map and validate items, dynamically calculating pricing specific to this city
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
        const { serviceId, quantity = 1 } = item;
        if (!mongoose.Types.ObjectId.isValid(serviceId)) {
            throw new ApiError(400, `Invalid Service ID: ${serviceId}`);
        }

        const service = await Service.findById(serviceId);
        if (!service || !service.active) {
            throw new ApiError(404, `Active service package not found for ID: ${serviceId}`);
        }

        // Find city pricing configured for the specified cityId
        const cityPriceObj = service.cityPricing.find(
            (cp) => cp.city.toString() === cityId.toString()
        );

        if (!cityPriceObj) {
            throw new ApiError(400, `Pricing for service '${service.name}' is not available in the selected city`);
        }

        const price = cityPriceObj.price;
        const itemCost = price * quantity;
        subtotal += itemCost;

        orderItems.push({
            service: serviceId,
            quantity,
            priceAtBooking: price,
            orderStatus: "Pending" // Default order status per service item
        });
    }

    // Calculate totals (could append tax logic in future)
    const tax = 0;
    const total = subtotal + tax;

    // Generate unique code
    const orderId = await generateUniqueOrderId();

    // 3. Create the order in pending state (services are prepaid only)
    const order = await ServiceOrder.create({
        orderId,
        customer: customerId,
        city: cityId,
        items: orderItems,
        subtotal,
        tax,
        total,
        address: addressId,
        paymentStatus: "Pending", // Default pending until mock verification completes
    });

    await order.populate([
        { path: "customer", select: "name phone" },
        { path: "city", select: "name slug" },
        { path: "address" },
        { path: "items.service", select: "name image details" }
    ]);

    return res.status(201).json(
        new ApiResponse(201, order, "Service order created successfully. Awaiting payment details.")
    );
});

// @desc    Get order details by ID
// @route   GET /api/v1/orders/services/:id
// @access  Private (Customer / Admin)
const getServiceOrderDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid order ID");
    }

    const order = await ServiceOrder.findById(id).populate([
        { path: "customer", select: "name phone" },
        { path: "city", select: "name slug" },
        { path: "address" },
        { path: "items.service", select: "name image details" }
    ]);

    if (!order) throw new ApiError(404, "Order not found");

    // Secure checking: Customers can only fetch their own orders
    if (req.customer && order.customer._id.toString() !== req.customer._id.toString()) {
        throw new ApiError(403, "Access denied: Cannot view another customer's order");
    }

    return res.status(200).json(new ApiResponse(200, order, "Order details fetched successfully"));
});

// @desc    Get current customer's booking list
// @route   GET /api/v1/orders/services
// @access  Private (Customer)
const getCustomerServiceOrders = asyncHandler(async (req, res) => {
    const orders = await ServiceOrder.find({ customer: req.customer._id })
        .populate([
            { path: "city", select: "name slug" },
            { path: "address" },
            { path: "items.service", select: "name image" }
        ])
        .sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, orders, "Customer bookings fetched successfully"));
});

// --- ADMIN / STAFF ENDPOINTS ---

const adminGetAllOrders = asyncHandler(async (req, res) => {
    const { status, city, search, page = 1, limit = 10 } = req.query;
    const filter = {};

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skipNum = (pageNum - 1) * limitNum;

    // Apply item status filter
    if (status && status !== "all") {
        filter["items.orderStatus"] = status;
    }

    // Apply city ID filter
    if (city && mongoose.Types.ObjectId.isValid(city)) {
        filter.city = city;
    }

    // Perform query population and match logic
    let matchingCustomerIds = [];
    if (search) {
        // Search customer references by name or phone
        const { Customer } = await import("../models/customer.model.js");
        const customers = await Customer.find({
            $or: [
                { name: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } }
            ]
        }).select("_id");
        matchingCustomerIds = customers.map(c => c._id);

        filter.$or = [
            { orderId: { $regex: search, $options: "i" } },
            { customer: { $in: matchingCustomerIds } }
        ];
    }

    const totalCount = await ServiceOrder.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limitNum);

    const orders = await ServiceOrder.find(filter)
        .populate([
            { path: "customer", select: "name phone" },
            { path: "city", select: "name slug" },
            { path: "address" },
            { path: "items.service", select: "name image" }
        ])
        .sort({ createdAt: -1 })
        .skip(skipNum)
        .limit(limitNum);

    return res.status(200).json(
        new ApiResponse(200, {
            orders,
            totalCount,
            totalPages,
            currentPage: pageNum,
            limit: limitNum
        }, "Admin orders fetched successfully")
    );
});

// @desc    Admin: Update service order parameters (status of specific item inside order, payment details)
// @route   PUT /api/v1/orders/admin/services/:id
// @access  Private (Admin / Staff)
const adminUpdateOrderStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { itemId, orderStatus, paymentStatus } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid order ID");
    }

    const order = await ServiceOrder.findById(id);
    if (!order) throw new ApiError(404, "Order not found");

    // 1. If itemId is provided, update the status of that specific item
    if (itemId && orderStatus !== undefined) {
        const item = order.items.id(itemId);
        if (!item) {
            throw new ApiError(404, "Service item not found inside this order");
        }
        item.orderStatus = orderStatus;
    } else if (orderStatus !== undefined) {
        // Fallback: If no itemId is provided but orderStatus is, update all items inside the order
        order.items.forEach(item => {
            item.orderStatus = orderStatus;
        });
    }

    // 2. Update payment status if provided
    if (paymentStatus !== undefined) {
        order.paymentStatus = paymentStatus;
    }

    await order.save();
    
    await order.populate([
        { path: "customer", select: "name phone" },
        { path: "city", select: "name slug" },
        { path: "address" },
        { path: "items.service", select: "name" }
    ]);

    return res.status(200).json(
        new ApiResponse(200, order, "Order statuses updated successfully")
    );
});

export {
    createServiceOrder,
    getServiceOrderDetails,
    getCustomerServiceOrders,
    adminGetAllOrders,
    adminUpdateOrderStatus
};
