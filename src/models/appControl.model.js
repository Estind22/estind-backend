import mongoose from "mongoose";

const appControlSchema = new mongoose.Schema(
    {
        ios: {
            enabled: {
                type: Boolean,
                default: false,
            },
            forceUpdate: {
                type: Boolean,
                default: false,
            },
            versionCode: {
                type: String,
                default: "",
            },
            storeUrl: {
                type: String,
                default: "",
            },
            title: {
                type: String,
                default: "Update Available",
            },
            message: {
                type: String,
                default: "A new version of the app is available. Please update to continue.",
            },
        },
        android: {
            enabled: {
                type: Boolean,
                default: false,
            },
            forceUpdate: {
                type: Boolean,
                default: false,
            },
            versionCode: {
                type: String,
                default: "",
            },
            storeUrl: {
                type: String,
                default: "",
            },
            title: {
                type: String,
                default: "Update Available",
            },
            message: {
                type: String,
                default: "A new version of the app is available. Please update to continue.",
            },
        },
    },
    { timestamps: true }
);

export const AppControl = mongoose.model("AppControl", appControlSchema);
