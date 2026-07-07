import mongoose from "mongoose";

const { Schema } = mongoose;

const enquirySchema = new Schema(
    {
        customer: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            required: [true, "Customer reference is required"],
            index: true,
        },
        property: {
            type: Schema.Types.ObjectId,
            ref: "Property",
            required: [true, "Property reference is required"],
            index: true,
        },
        keyman: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },
        city: {
            type: Schema.Types.ObjectId,
            ref: "City",
            required: [true, "City reference is required"],
            index: true,
        },
        urgency: {
            type: String,
            enum: ["Immediate", "Within 15 Days", "Just Exploring"],
            required: [true, "Urgency classification is required"],
        },
        enquiryType: {
            type: String,
            enum: ["Enquiry", "Call Request"],
            default: "Enquiry",
        },
        notes: {
            type: String,
            default: "",
            trim: true,
        },
        status: {
            type: String,
            enum: ["New", "In Progress", "Contacted", "Booked", "Cancelled"],
            default: "New",
            index: true,
        }
    },
    { timestamps: true }
);

export const Enquiry = mongoose.model("Enquiry", enquirySchema);
