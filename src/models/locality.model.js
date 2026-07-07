import mongoose from "mongoose";

const localitySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Locality name is required"],
            trim: true,
        },
        slug: {
            type: String,
            required: [true, "Slug is required"],
            trim: true,
            lowercase: true,
            index: true,
        },
        city: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "City",
            required: [true, "Parent city reference is required"],
            index: true,
        },
        active: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Compound unique index ensuring slugs are unique within each parent city
localitySchema.index({ slug: 1, city: 1 }, { unique: true });

// Enforce strict uniqueness check per-city before saving
localitySchema.pre("save", async function (next) {
    if (this.isModified("slug") || this.isModified("city")) {
        const Locality = mongoose.model("Locality");
        const existing = await Locality.findOne({ slug: this.slug, city: this.city });
        if (existing && existing._id.toString() !== this._id.toString()) {
            return next(new Error("This locality is already available"));
        }
    }
    next();
});

export const Locality = mongoose.model("Locality", localitySchema);
