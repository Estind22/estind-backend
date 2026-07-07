// src/controllers/user.controller.js
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Session from "../models/session.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

// Create User (Admin only or manager level depending on RBAC)
export const createUser = asyncHandler(async (req, res) => {
    const { uniqueId, name, email, phoneNo, password, role, designation, permissions, city } = req.body;

    if (!uniqueId) throw new ApiError(400, "uniqueId is required");
    if (!name) throw new ApiError(400, "name is required");
    if (!phoneNo) throw new ApiError(400, "phoneNo is required");
    if (!password || password.length < 6) throw new ApiError(400, "password is required (min 6 chars)");

    const normalizedUniqueId = uniqueId.toString().trim().toLowerCase();
    if (!/^[a-z0-9._]{3,30}$/.test(normalizedUniqueId)) {
        throw new ApiError(400, "Invalid uniqueId format");
    }

    const existingUser = await User.findOne({ uniqueId: normalizedUniqueId }).lean().select("_id");
    if (existingUser) throw new ApiError(409, "uniqueId already taken");

    const existingPhone = await User.findOne({ phoneNo: phoneNo.toString().trim() }).lean().select("_id");
    if (existingPhone) throw new ApiError(409, "Phone number already in use");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
        uniqueId: normalizedUniqueId,
        name,
        email,
        phoneNo: phoneNo.toString().trim(),
        passwordHash,
        role: role || 'employee',
        designation,
        city: city ? city : null,
        permissions: permissions || []
    });

    const safeUser = newUser.toObject();
    delete safeUser.passwordHash;

    return res.status(201).json(new ApiResponse(201, { user: safeUser }, "User created successfully"));
});

// Update User
export const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, phoneNo, password, role, designation, permissions, active, status, city } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid User ID");

    const user = await User.findById(id);
    if (!user) throw new ApiError(404, "User not found");

    if (phoneNo && phoneNo !== user.phoneNo) {
        const existingPhone = await User.findOne({ phoneNo: phoneNo.toString().trim(), _id: { $ne: id } }).lean().select("_id");
        if (existingPhone) throw new ApiError(409, "Phone number already in use");
        user.phoneNo = phoneNo.toString().trim();
    }

    if (password) {
        if (password.length < 6) throw new ApiError(400, "Password must be at least 6 characters");
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(password, salt);
    }

    if (name) user.name = name;
    if (email !== undefined) user.email = email;
    if (role) user.role = role;
    if (designation !== undefined) user.designation = designation;
    if (permissions) user.permissions = permissions;
    if (active !== undefined) user.active = active;
    if (status) user.status = status;
    if (city !== undefined) user.city = city ? city : null;

    await user.save();

    const safeUser = user.toObject();
    delete safeUser.passwordHash;

    return res.json(new ApiResponse(200, { user: safeUser }, "User updated successfully"));
});

// Delete User
export const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(400, "Invalid User ID");

    const user = await User.findById(id);
    if (!user) throw new ApiError(404, "User not found");

    await User.deleteOne({ _id: id });
    await Session.deleteMany({ userId: id });

    return res.json(new ApiResponse(200, null, "User deleted successfully"));
});

// List Users
export const listUsers = asyncHandler(async (req, res) => {
    const {
        role,
        page = 1,
        limit = 10,
        status,
        searchQuery = ""
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10));
    const parsedLimit = Math.min(100, parseInt(limit, 10));
    const skip = (parsedPage - 1) * parsedLimit;

    // Base filter (exluding deleted ones)
    const filter = {
        status: { $ne: "deleted" }
    };

    if (role) {
        filter.role = role;
    }

    if (status !== undefined && status !== '') {
        if (status === "active" || status === "true" || status === true) {
            filter.active = true;
        } else if (status === "inactive" || status === "false" || status === false) {
            filter.active = false;
        } else {
            filter.status = status;
        }
    }

    // Search query matching regex
    if (searchQuery && searchQuery.trim()) {
        const escapedQuery = searchQuery.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(escapedQuery, 'i');
        filter.$or = [
            { name: regex },
            { uniqueId: regex },
            { email: regex },
            { phoneNo: regex }
        ];
    }

    const [users, totalCount] = await Promise.all([
        User.find(filter)
            .select("-passwordHash")
            .populate("city", "name slug")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parsedLimit)
            .lean(),
        User.countDocuments(filter)
    ]);

    return res.status(200).json(
        new ApiResponse(200, {
            users,
            totalCount,
            pagination: {
                page: parsedPage,
                limit: parsedLimit,
                hasNextPage: parsedPage * parsedLimit < totalCount
            }
        }, "Users listed successfully")
    );
});

// Get My Profile
export const getMyProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("-passwordHash").lean();
    if (!user) throw new ApiError(404, "User not found");
    return res.json(new ApiResponse(200, { user }, "Profile fetched successfully"));
});

// Update Password
export const updatePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword) throw new ApiError(400, "Current password is required");
    if (!newPassword || newPassword.length < 6) throw new ApiError(400, "New password is required (min 6 chars)");

    const user = await User.findById(req.user._id);
    if (!user) throw new ApiError(404, "User not found");

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) throw new ApiError(401, "Invalid current password");

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.json(new ApiResponse(200, null, "Password updated successfully"));
});

// Get User Active Sessions
export const getUserActiveSessions = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid User ID");
    }

    const activeSessions = await Session.find({ userId: id }).sort({ createdAt: -1 }).lean();
    return res.json(new ApiResponse(200, { activeSessions }, "User Active Sessions Fetched"));
});