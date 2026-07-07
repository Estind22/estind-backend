import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Project name is required"],
            trim: true,
        },
        slug: {
            type: String,
            required: [true, "Slug is required"],
            unique: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        developer: {
            type: String,
            trim: true,
            default: "",
        },
        locality: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Locality",
            required: [true, "Locality reference is required"],
            index: true,
        },
        city: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "City",
            required: [true, "City reference is required"],
            index: true,
        },
        constructionStatus: {
            type: String,
            enum: ["Ready to Move", "Under Construction"],
            default: "Ready to Move",
        },
        amenities: {
            type: [String],
            default: [],
        },
        images: {
            type: [String],
            default: [],
        },
        description: {
            type: String,
            default: "",
        },
        active: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Pre-save slug collision resolution
projectSchema.pre("save", async function (next) {
    if (this.isModified("slug") || this.isNew) {
        const Project = mongoose.model("Project");
        let tempSlug = this.slug;
        let count = 0;
        let match = await Project.findOne({ slug: tempSlug });
        
        while (match && match._id.toString() !== this._id.toString()) {
            count++;
            tempSlug = `${this.slug}-${count}`;
            match = await Project.findOne({ slug: tempSlug });
        }
        this.slug = tempSlug;
    }
    next();
});

export const Project = mongoose.model("Project", projectSchema);
