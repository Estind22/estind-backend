// src/models/customer.model.js
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const customerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        phone: {
            type: String,
            required: [true, "Phone number is required"],
            unique: true,
            trim: true,
            index: true,
        },
        dob: {
            type: Date,
            default: null,
        },
        active: {
            type: Boolean,
            default: true,
        },
        otp: {
            type: String,
            default: null,
        },
        otpExpiry: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// Method to generate JWT Access Token for customers
customerSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            phone: this.phone,
            name: this.name,
            role: "customer"
        },
        process.env.ACCESS_TOKEN_SECRET || "CustomerSecretKey"
    );
};

export const Customer = mongoose.model("Customer", customerSchema);
