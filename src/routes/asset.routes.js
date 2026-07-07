// src/routes/asset.routes.js
import express from "express";
import {
    createAsset,
    updateAsset,
    deleteAsset,
    listAssets
} from "../controllers/asset.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { uploadGeneric } from "../middlewares/upload.middleware.js";

const router = express.Router();

// list assets (everyone authenticated)
router.get("/list", authenticate, listAssets);

// save asset metadata (after successful R2 upload) or upload directly
router.post("/create", authenticate, uploadGeneric.single("file"), createAsset);

// update asset (name / tags only)
router.patch("/update/:id", authenticate, updateAsset);

// delete asset (uploader or company admin)
router.delete("/:id", authenticate, deleteAsset);

export default router;
