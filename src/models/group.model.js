import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Group heading title is required"],
            trim: true,
        },
        description: {
            type: String,
            default: "",
            trim: true,
        },
        city: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "City",
            required: [true, "City reference is required"],
            index: true,
        },
        groupType: {
            type: String,
            enum: ["properties", "projects", "localities"],
            required: [true, "Group type classification (properties, projects, or localities) is required"],
        },
        // UI Specifications
        backgroundColor: {
            type: String,
            default: "#ffffff",
            trim: true,
        },
        layoutType: {
            type: String,
            enum: ["scroll", "grid"],
            default: "scroll",
        },
        // Mapped elements dynamically queried depending on groupType
        properties: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Property" }],
            default: [],
        },
        projects: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],
            default: [],
        },
        localities: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Locality" }],
            default: [],
        },
        active: {
            type: Boolean,
            default: true,
        },
        sequence: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

export const Group = mongoose.model("Group", groupSchema);
