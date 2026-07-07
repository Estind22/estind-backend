import { AppControl } from "../models/appControl.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * Get App Controls
 * Public endpoint to fetch global app settings (like update popups)
 */
export const getAppControls = asyncHandler(async (req, res) => {
    let controls = await AppControl.findOne();

    if (!controls) {
        // Create default controls if none exist
        controls = await AppControl.create({});
    }

    return res.status(200).json(
        new ApiResponse(200, controls, "App controls fetched successfully")
    );
});

/**
 * Update App Controls
 * Protected endpoint for Super Admin to update global app settings
 */
export const updateAppControls = asyncHandler(async (req, res) => {
    const { ios, android } = req.body;

    let controls = await AppControl.findOne();

    if (!controls) {
        controls = new AppControl();
    }

    if (ios) {
        controls.ios = {
            ...controls.ios,
            ...ios,
        };
    }

    if (android) {
        controls.android = {
            ...controls.android,
            ...android,
        };
    }

    await controls.save();

    return res.status(200).json(
        new ApiResponse(200, controls, "App controls updated successfully")
    );
});
