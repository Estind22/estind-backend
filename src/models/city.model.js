// src/models/city.model.js
import mongoose from "mongoose";

const citySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "City name is required"],
            trim: true,
        },
        slug: {
            type: String,
            required: [true, "City slug is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },
        image: {
            type: String,
            default: "",
        },
        icon: {
            type: String,
            default: "",
        },
        active: {
            type: Boolean,
            default: true,
        },
        alternateNames: [
            {
                type: String,
                trim: true,
                lowercase: true
            }
        ]
    },
    { timestamps: true }
);

export const City = mongoose.model("City", citySchema);
