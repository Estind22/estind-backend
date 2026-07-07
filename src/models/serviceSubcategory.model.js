// src/models/serviceSubcategory.model.js
import mongoose from "mongoose";

const serviceSubcategorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Subcategory name is required"],
            trim: true,
        },
        slug: {
            type: String,
            required: [true, "Subcategory slug is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },
        image: {
            type: String,
            default: "",
        },
        // Array of categories — a subcategory can belong to multiple categories
        categories: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ServiceCategory",
            },
        ],
        active: {
            type: Boolean,
            default: true,
        },
        availableCities: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "City"
            }
        ]
    },
    { timestamps: true }
);

export const ServiceSubcategory = mongoose.model("ServiceSubcategory", serviceSubcategorySchema);
