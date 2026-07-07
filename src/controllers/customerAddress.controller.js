// src/controllers/customerAddress.controller.js
import { CustomerAddress } from "../models/customerAddress.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

// @desc    Create customer address
// @route   POST /api/v1/customers/addresses
// @access  Private (Customer)
const createAddress = asyncHandler(async (req, res) => {
    const { addressLine, landmark, city, state, pincode, addressType, isDefault } = req.body;
    const customerId = req.customer._id;

    if (!addressLine || !city || !state || !pincode) {
        throw new ApiError(400, "AddressLine, City, State, and Pincode are required");
    }

    if (!mongoose.Types.ObjectId.isValid(city)) {
        throw new ApiError(400, "Invalid City ID");
    }

    // If setting as default, unset other default addresses for this customer
    if (isDefault) {
        await CustomerAddress.updateMany({ customer: customerId }, { isDefault: false });
    }

    // Check if customer has any addresses. If not, make this default automatically
    const count = await CustomerAddress.countDocuments({ customer: customerId });
    const makeDefault = count === 0 ? true : !!isDefault;

    const address = await CustomerAddress.create({
        customer: customerId,
        addressLine,
        landmark: landmark || "",
        city,
        state,
        pincode,
        addressType: addressType || "Home",
        isDefault: makeDefault,
    });

    await address.populate("city", "name slug");

    return res.status(201).json(new ApiResponse(201, address, "Address created successfully"));
});

// @desc    Get current customer addresses
// @route   GET /api/v1/customers/addresses
// @access  Private (Customer)
const getAddresses = asyncHandler(async (req, res) => {
    const addresses = await CustomerAddress.find({ customer: req.customer._id })
        .populate("city", "name slug")
        .sort({ isDefault: -1, createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, addresses, "Addresses retrieved successfully"));
});

// @desc    Update customer address
// @route   PUT /api/v1/customers/addresses/:id
// @access  Private (Customer)
const updateAddress = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { addressLine, landmark, city, state, pincode, addressType, isDefault } = req.body;
    const customerId = req.customer._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid address ID");
    }

    const address = await CustomerAddress.findOne({ _id: id, customer: customerId });
    if (!address) {
        throw new ApiError(404, "Address not found");
    }

    if (isDefault) {
        await CustomerAddress.updateMany({ customer: customerId }, { isDefault: false });
        address.isDefault = true;
    }

    if (addressLine !== undefined) address.addressLine = addressLine;
    if (landmark !== undefined) address.landmark = landmark;
    if (state !== undefined) address.state = state;
    if (pincode !== undefined) address.pincode = pincode;
    if (addressType !== undefined) address.addressType = addressType;

    if (city !== undefined) {
        if (!mongoose.Types.ObjectId.isValid(city)) throw new ApiError(400, "Invalid City ID");
        address.city = city;
    }

    await address.save();
    await address.populate("city", "name slug");

    return res.status(200).json(new ApiResponse(200, address, "Address updated successfully"));
});

// @desc    Delete customer address
// @route   DELETE /api/v1/customers/addresses/:id
// @access  Private (Customer)
const deleteAddress = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const customerId = req.customer._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid address ID");
    }

    const address = await CustomerAddress.findOneAndDelete({ _id: id, customer: customerId });
    if (!address) {
        throw new ApiError(404, "Address not found");
    }

    // If we deleted the default address, set another address as default if exists
    if (address.isDefault) {
        const nextAddress = await CustomerAddress.findOne({ customer: customerId });
        if (nextAddress) {
            nextAddress.isDefault = true;
            await nextAddress.save();
        }
    }

    return res.status(200).json(new ApiResponse(200, null, "Address deleted successfully"));
});

export { createAddress, getAddresses, updateAddress, deleteAddress };
