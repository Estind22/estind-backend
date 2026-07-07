// src/models/serviceOrder.model.js
import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
    service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: [true, "Service reference is required"],
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, "Quantity cannot be less than 1"],
        default: 1,
    },
    priceAtBooking: {
        type: Number,
        required: [true, "Booking price snapshot is required"],
    },
    orderStatus: {
        type: String,
        enum: ["Pending", "Accepted", "In Progress", "Completed", "Cancelled"],
        default: "Pending",
        index: true,
    }
});

const serviceOrderSchema = new mongoose.Schema(
    {
        orderId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: [true, "Customer reference is required"],
            index: true,
        },
        city: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "City",
            required: [true, "Order city reference is required"],
        },
        items: [orderItemSchema],
        subtotal: {
            type: Number,
            required: true,
        },
        tax: {
            type: Number,
            default: 0,
        },
        total: {
            type: Number,
            required: true,
        },
        address: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CustomerAddress",
            required: [true, "Shipping / Service address is required"],
        },
        paymentStatus: {
            type: String,
            enum: ["Pending", "Paid", "Failed"],
            default: "Pending",
        },
        paymentDetails: {
            type: Object,
            default: {},
        },
    },
    { timestamps: true }
);

export const ServiceOrder = mongoose.model("ServiceOrder", serviceOrderSchema);
