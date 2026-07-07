// src/models/customerAddress.model.js
import mongoose from "mongoose";

const customerAddressSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: [true, "Customer reference is required"],
            index: true,
        },
        addressLine: {
            type: String,
            required: [true, "Address line is required"],
            trim: true,
        },
        landmark: {
            type: String,
            trim: true,
            default: "",
        },
        city: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "City",
            required: [true, "City is required"],
        },
        state: {
            type: String,
            required: [true, "State is required"],
            trim: true,
        },
        pincode: {
            type: String,
            required: [true, "Pincode is required"],
            trim: true,
        },
        addressType: {
            type: String,
            enum: ["Home", "Office", "Other"],
            default: "Home",
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

export const CustomerAddress = mongoose.model("CustomerAddress", customerAddressSchema);
