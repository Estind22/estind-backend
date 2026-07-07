// src/models/serviceCategory.model.js
import mongoose from "mongoose";

const serviceCategorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Category name is required"],
            trim: true,
        },
        slug: {
            type: String,
            required: [true, "Category slug is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },
        image: {
            type: String,
            default: "",
        },
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

export const ServiceCategory = mongoose.model("ServiceCategory", serviceCategorySchema);
