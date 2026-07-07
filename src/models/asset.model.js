// models/asset.model.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const AssetSchema = new Schema({
    company: {
        type: Schema.Types.ObjectId,
        ref: "Company"
    },

    name: {
        type: String,
        required: true
    },

    tags: [{
        type: String,
        trim: true
    }],

    fileType: {
        type: String,   // pdf docx png jpg etc
        required: true
    },

    size: {
        type: Number,
        required: true // bytes
    },

    r2Key: {
        type: String,   // cloudflare object key
        required: true
    },

    uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    }

}, { timestamps: true });

const Asset = mongoose.model("Asset", AssetSchema);

export default Asset;
