// src/controllers/asset.controller.js
import mongoose from "mongoose";
import Asset from "../models/asset.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
// import { deleteFromR2, uploadToR2 } from "../utils/cloudflareR2.js";
import { v4 as uuidv4 } from "uuid";

export const createAsset = asyncHandler(async (req, res) => {
    let name = req.body.name;
    let tags = req.body.tags || [];
    let fileType = req.body.fileType;
    let r2Key = req.body.r2Key;
    let size = req.body.size;

    // Handle parsed tags robustness
    let parsedTags = [];
    if (tags) {
        if (Array.isArray(tags)) {
            parsedTags = tags;
        } else {
            try {
                const parsed = JSON.parse(tags);
                if (Array.isArray(parsed)) {
                    parsedTags = parsed;
                } else {
                    parsedTags = [tags];
                }
            } catch (e) {
                parsedTags = [tags];
            }
        }
    }

    if (req.file) {
        // Direct file upload to backend
        const fileSize = req.file.size;
        const safeName = req.file.originalname.replace(/\s+/g, "_");
        const type = req.body.type || "assets";
        const key = `estind/${type}/${new Date().getFullYear()}/${uuidv4()}-${safeName}`;

        // 1. Upload file to R2
        try {
            await uploadToR2(key, req.file.buffer, req.file.mimetype);
        } catch (uploadError) {
            console.error("R2 upload error:", uploadError);
            throw new ApiError(500, "Failed to upload file to storage server");
        }

        // 2. Create asset in DB
        try {
            const asset = await Asset.create({
                name: (name || req.file.originalname).trim(),
                tags: parsedTags,
                fileType: req.file.mimetype,
                r2Key: key,
                size: fileSize,
                uploadedBy: req.user._id
            });

            return res
                .status(201)
                .json(new ApiResponse(201, { asset }, "Asset uploaded and saved successfully"));
        } catch (dbError) {
            console.error("Database save failed, cleaning up R2 file:", dbError);
            try {
                await deleteFromR2(key);
            } catch (cleanupError) {
                console.error("R2 cleanup failed:", cleanupError);
            }
            throw dbError;
        }
    } else {
        // Old metadata-only flow (file already uploaded to R2)
        if (!name) throw new ApiError(400, "Asset name is required");
        if (!fileType) throw new ApiError(400, "fileType is required");
        if (!r2Key) throw new ApiError(400, "r2Key is required");

        const fileSize = Number(size || 0);

        const asset = await Asset.create({
            name: name.trim(),
            tags: parsedTags,
            fileType,
            r2Key,
            size: fileSize,
            uploadedBy: req.user._id
        });

        return res
            .status(201)
            .json(new ApiResponse(201, { asset }, "Asset saved successfully"));
    }
});

export const listAssets = asyncHandler(async (req, res) => {
    const { tag, fileType } = req.query;

    const filter = {};

    if (tag) {
        filter.tags = tag;
    }

    if (fileType) {
        filter.fileType = fileType;
    }

    const assets = await Asset.find(filter)
        .sort({ createdAt: -1 })
        .populate("uploadedBy", "name role designation")
        .lean();

    return res
        .status(200)
        .json(new ApiResponse(200, { assets }, "Assets fetched successfully"));
});

export const updateAsset = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid asset id");
    }

    const asset = await Asset.findById(id);
    if (!asset) throw new ApiError(404, "Asset not found");

    const isAdmin = req.user.role === 'admin';
    const isUploader = asset.uploadedBy.toString() === req.user._id.toString();

    if (!isAdmin && !isUploader) {
        throw new ApiError(403, "You are not allowed to update this asset");
    }

    const payload = {};
    if (req.body.name) payload.name = req.body.name.trim();
    if (req.body.tags) payload.tags = req.body.tags;

    if (Object.keys(payload).length === 0) {
        throw new ApiError(400, "No valid fields provided");
    }

    const updated = await Asset.findByIdAndUpdate(
        id,
        { $set: payload },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, { asset: updated }, "Asset updated successfully"));
});

export const deleteAsset = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid asset id");
    }

    const asset = await Asset.findById(id);
    if (!asset) throw new ApiError(404, "Asset not found");

    const isAdmin = req.user.role === 'admin';
    const isUploader = asset.uploadedBy.toString() === req.user._id.toString();

    if (!isAdmin && !isUploader) {
        throw new ApiError(403, "You are not allowed to delete this asset");
    }

    // delete from cloudflare
    try {
        await deleteFromR2(asset.r2Key);
    } catch (r2Error) {
        console.warn("R2 deletion failed, proceeding with DB deletion:", r2Error?.message || r2Error);
    }

    // delete from mongo
    await asset.deleteOne();

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Asset deleted successfully"));
});
