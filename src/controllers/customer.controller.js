// src/controllers/customer.controller.js
import { Customer } from "../models/customer.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Cookie options for reliable customer sessions
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax"
};

// @desc    Request OTP / Register new user if not exists
// @route   POST /api/v1/customers/otp/request
// @access  Public
const requestOtp = asyncHandler(async (req, res) => {
    const { phone, name } = req.body;

    if (!phone) {
        throw new ApiError(400, "Phone number is required");
    }

    let customer = await Customer.findOne({ phone: phone.trim() });

    if (!customer) {
        // If not found, a name is required to complete automatic registration
        if (!name) {
            throw new ApiError(400, "New customer name is required for registration");
        }
        customer = await Customer.create({
            name: name.trim(),
            phone: phone.trim(),
        });
    }

    // Set mock OTP as "000000" valid for 10 minutes
    customer.otp = "000000";
    customer.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await customer.save();

    return res.status(200).json(
        new ApiResponse(200, { phone: customer.phone }, "OTP code '000000' sent successfully")
    );
});

// @desc    Verify OTP and log in / generate JWT Session token
// @route   POST /api/v1/customers/otp/verify
// @access  Public
const verifyOtp = asyncHandler(async (req, res) => {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
        throw new ApiError(400, "Phone number and OTP code are required");
    }

    const customer = await Customer.findOne({ phone: phone.trim() });
    if (!customer) {
        throw new ApiError(404, "Customer not found with this phone number");
    }

    if (!customer.active) {
        throw new ApiError(403, "This customer account is deactivated");
    }

    // Validate OTP and Expiry
    if (customer.otp !== otp) {
        throw new ApiError(400, "Invalid OTP code");
    }

    if (new Date() > customer.otpExpiry) {
        throw new ApiError(400, "OTP code has expired. Please request a new one.");
    }

    // Clear OTP details upon verification
    customer.otp = null;
    customer.otpExpiry = null;
    await customer.save();

    // Generate JWT customer token
    const token = customer.generateAccessToken();

    // Set cookie and send response (works for both Web cookie and App json parse)
    res.cookie("customerToken", token, cookieOptions);

    return res.status(200).json(
        new ApiResponse(200, { customer, token }, "Logged in successfully")
    );
});

// @desc    Get current customer profile
// @route   GET /api/v1/customers/profile
// @access  Private (Customer)
const getCustomerProfile = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(200, req.customer, "Profile fetched successfully")
    );
});

// @desc    Update current customer details
// @route   PUT /api/v1/customers/profile
// @access  Private (Customer)
const updateCustomerProfile = asyncHandler(async (req, res) => {
    const { name, dob } = req.body;
    const customer = req.customer;

    if (name !== undefined) customer.name = name.trim();
    if (dob !== undefined) customer.dob = dob;

    await customer.save();

    return res.status(200).json(
        new ApiResponse(200, customer, "Profile updated successfully")
    );
});

// @desc    Delete current customer profile
// @route   DELETE /api/v1/customers/profile
// @access  Private (Customer)
const deleteCustomerProfile = asyncHandler(async (req, res) => {
    const customer = req.customer;

    await Customer.findByIdAndDelete(customer._id);

    // Clear session cookies
    res.clearCookie("customerToken");

    return res.status(200).json(
        new ApiResponse(200, null, "Customer account deleted successfully")
    );
});

// @desc    Admin: Get all customers list (paginated, searchable)
// @route   GET /api/v1/customers
// @access  Private (Admin)
const getAllCustomers = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { search, active } = req.query;
    const query = {};

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } }
        ];
    }

    if (active !== undefined && active !== "") {
        query.active = active === "true";
    }

    const totalCount = await Customer.countDocuments(query);
    const customers = await Customer.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    return res.status(200).json(
        new ApiResponse(200, {
            customers,
            totalCount,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        }, "Customers fetched successfully")
    );
});

// @desc    Admin: Update a specific customer details
// @route   PUT /api/v1/customers/:id
// @access  Private (Admin)
const adminUpdateCustomer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, phone, dob, active } = req.body;

    const customer = await Customer.findById(id);
    if (!customer) {
        throw new ApiError(404, "Customer not found");
    }

    if (name !== undefined) customer.name = name.trim();
    if (phone !== undefined) {
        const trimmedPhone = phone.trim();
        // Check uniqueness if phone changes
        if (trimmedPhone !== customer.phone) {
            const exists = await Customer.findOne({ phone: trimmedPhone });
            if (exists) {
                throw new ApiError(400, "A customer with this phone number already exists");
            }
            customer.phone = trimmedPhone;
        }
    }
    if (dob !== undefined) customer.dob = dob;
    if (active !== undefined) customer.active = active;

    await customer.save();

    return res.status(200).json(
        new ApiResponse(200, customer, "Customer profile updated successfully")
    );
});

// @desc    Admin: Delete a specific customer by ID
// @route   DELETE /api/v1/customers/:id
// @access  Private (Admin)
const adminDeleteCustomer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deleted = await Customer.findByIdAndDelete(id);
    if (!deleted) {
        throw new ApiError(404, "Customer not found");
    }
    return res.status(200).json(
        new ApiResponse(200, null, "Customer profile deleted by admin successfully")
    );
});

export {
    requestOtp,
    verifyOtp,
    getCustomerProfile,
    updateCustomerProfile,
    deleteCustomerProfile,
    getAllCustomers,
    adminDeleteCustomer,
    adminUpdateCustomer
};
