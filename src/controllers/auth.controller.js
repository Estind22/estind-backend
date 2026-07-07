// controllers/auth.controller.js
import Session from "../models/session.model.js";
import { v4 as uuidv4 } from "uuid";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";

/**
 * Archive session -> delete the session doc.
 */
async function archiveAndDeleteSession(session) {
    try {
        await Session.deleteOne({ _id: session._id });
    } catch (e) {
        console.warn("delete session failed", e?.message || e);
    }
}

export const login = asyncHandler(async (req, res) => {
    const { uniqueId, password, deviceId, deviceType = "desktop", deviceName, subscription } = req.body;

    // 1) find user
    const user = await User.findOne({ uniqueId });
    if (!user) throw new ApiError(404, "User not found");
    if (!user.active) throw new ApiError(403, "User inactive");

    // 2) verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new ApiError(401, "Invalid password");

    // 3) mobile/session handling
    const normalizedDeviceType =
        deviceType === "app" ? "app" : (deviceType === "mobile" ? "mobile" : "desktop");

    const existingSessions = await Session.find({
        userId: user._id,
        deviceType: normalizedDeviceType
    }).lean();

    if (existingSessions.length) {
        await Promise.all(
            existingSessions.map(s => archiveAndDeleteSession(s))
        );
    }

    // 4) create new session
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await Session.create({
        _id: sessionId,
        userId: user._id,
        deviceId: deviceId || null,
        deviceType: normalizedDeviceType,
        deviceName,
        ua: req.headers["user-agent"] || null,
        ip: req.ip,
        expiresAt,
        active: true,
        subscription: subscription || null
    });

    const token = jwt.sign(
        { id: user._id, uniqueId: user.uniqueId, role: user.role, sessionId },
        process.env.JWT_SECRET,
        { expiresIn: "60d" }
    );

    const cleanUser = await User.findById(user._id)
        .select("-passwordHash").lean();

    const options = {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 24 * 60 * 60 * 1000
    };

    return res
        .cookie("accessToken", token, options)
        .json(new ApiResponse(200, {
            user: cleanUser,
            accessToken: token,
            sessionId
        }, "User Logged in Successfully"));
});

// LOGOUT
export const logout = asyncHandler(async (req, res) => {
    try {
        const sessionIdFromBody = req.body?.sessionId || null;
        const deviceIdFromBody = req.body?.deviceId || null;

        let session = null;

        if (sessionIdFromBody) {
            session = await Session.findById(sessionIdFromBody).lean();
            // If session exists and belongs to different authenticated user, forbid
            if (session && req.user && req.user._id && session.userId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ ok: false, error: "Forbidden: session does not belong to authenticated user" });
            }
        }

        if (!session && deviceIdFromBody) {
            session = await Session.findOne({ deviceId: deviceIdFromBody }).lean();
        }

        if (!session) {
            try { res.clearCookie("accessToken"); } catch (e) { }
            return res.json({ ok: true, message: "No active session found." });
        }

        // archive and delete session
        await archiveAndDeleteSession(session);

        try { res.clearCookie("accessToken"); } catch (e) { }
        return res.json({ ok: true, message: "Logged out and session cleared" });
    } catch (err) {
        console.error("logout error", err);
        res.status(500).json({ error: "internal" });
    }
});

// GET SESSION (unchanged)
export const getSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const session = await Session.findById(sessionId).lean();
    if (!session || !session.active) throw new ApiError(404, "Session not found");
    return res.json({ ok: true });
});
