import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Property title is required"],
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
        city: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "City",
            required: [true, "City reference is required"],
            index: true,
        },
        locality: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Locality",
            required: [true, "Locality reference is required"],
            index: true,
        },
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            default: null,
            index: true,
        },
        keyman: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },
        listingType: {
            type: String,
            enum: ["Sale", "Rent"],
            required: [true, "Listing type (Sale/Rent) is required"],
            index: true,
        },
        sectorType: {
            type: String,
            enum: ["Residential", "Commercial"],
            required: [true, "Sector classification is required"],
            index: true,
        },
        propertyType: {
            type: String,
            enum: [
                // Residential
                "Builder Floor",
                "Apartment",
                "PG",
                "Independent House",
                "Villa",
                "Penthouse",
                "Plot",
                // Commercial
                "Office Space",
                "Warehouse",
                "Shop",
                "Coworking Space",
                "Showroom",
                "Land",
                "Industrial Plot"
            ],
            required: [true, "Property sub-type is required"],
            index: true,
        },
        price: {
            type: Number,
            required: [true, "Base transaction price is required"],
            min: [0, "Price cannot be less than 0"]
        },
        tokenAmount: {
            type: Number,
            default: 0,
            min: [0, "Token booking amount cannot be less than 0"]
        },
        deposit: {
            type: String, // e.g., "2 months"
            default: "",
        },
        // Residential Specific Fields
        bhk: {
            type: Number, // e.g. 1, 2, 3
            default: null,
            min: [0, "BHK cannot be less than 0"]
        },
        bathrooms: {
            type: Number,
            default: null,
            min: [0, "Bathrooms count cannot be less than 0"]
        },
        floor: {
            type: Number,
            default: null,
            min: [0, "Floor count cannot be less than 0"]
        },
        furnishingStatus: {
            type: String,
            enum: ["Unfurnished", "Semi-Furnished", "Fully-Furnished", ""],
            default: "",
        },
        // Area measurements
        areaValue: {
            type: Number,
            required: [true, "Property area dimensions value is required"],
            min: [0, "Area value cannot be less than 0"]
        },
        areaUnit: {
            type: String,
            enum: ["Sq-Ft", "Sq-Yd", "Sq-Mt", "Gaj", "Acre"],
            default: "Sq-Ft",
        },
        facing: {
            type: String,
            default: "",
        },
        parking: {
            type: Number,
            default: 0,
            min: [0, "Parking count cannot be less than 0"]
        },
        bookingStatus: {
            type: String,
            enum: ["Available", "Booked", "Reserved"],
            default: "Available",
        },
        active: {
            type: Boolean,
            default: true,
        },
        description: {
            type: String,
            default: "",
        },
        amenities: {
            type: [String],
            default: [],
        },
        images: {
            type: [String],
            default: [],
        },
    },
    { timestamps: true }
);

// Pre-save auto slug creation and uniqueness suffix logic
propertySchema.pre("save", async function (next) {
    if (this.isModified("slug") || this.isNew) {
        const Property = mongoose.model("Property");
        const Locality = mongoose.model("Locality");

        let resolvedLocalityName = "local";
        if (this.locality) {
            const locObj = await Locality.findById(this.locality);
            if (locObj) {
                resolvedLocalityName = locObj.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            }
        }

        let baseSlug = this.slug;
        let tempSlug = baseSlug;
        let count = 0;
        let match = await Property.findOne({ slug: tempSlug });

        while (match && match._id.toString() !== this._id.toString()) {
            count++;
            // Automatically append locality name and sequential counter on collision
            tempSlug = `${baseSlug}-${resolvedLocalityName}-${count}`;
            match = await Property.findOne({ slug: tempSlug });
        }
        this.slug = tempSlug;
    }
    next();
});

export const Property = mongoose.model("Property", propertySchema);
