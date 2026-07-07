// src/models/service.model.js
import mongoose from "mongoose";

const cityPricingSchema = new mongoose.Schema(
    {
        city: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "City",
            required: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { _id: false }
);

const serviceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Service name is required"],
            trim: true,
        },
        slug: {
            type: String,
            required: [true, "Service slug is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },
        image: {
            type: String,
            default: "",
        },
        details: {
            type: String,
            default: "",
        },
        subcategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ServiceSubcategory",
            required: [true, "Subcategory is required"],
        },
        // Denormalized for direct filtering without lookup
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ServiceCategory",
            required: [true, "Category is required"],
        },
        basePrice: {
            type: Number,
            default: 0,
            min: 0,
        },
        cityPricing: [cityPricingSchema],
        active: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

export const Service = mongoose.model("Service", serviceSchema);
