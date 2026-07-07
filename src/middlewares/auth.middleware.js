import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.model.js";
import { Customer } from "../models/customer.model.js";

export const authenticate = async (req, res, next) => {
    try {
        let token = null;
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
        // fallback to cookie (if present)
        if (!token && req.cookies) {
            token = req.cookies.accessToken;
        }

        // const token = req.cookies?.accessToken;
        if (!token) throw new ApiError(401, "Unauthorized: token missing");

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            // token invalid or expired
            throw new ApiError(401, err.message || "Invalid token");
        }

        // Attach minimal user info; optionally fetch full user
        const user = await User.findById(payload.id).select("-passwordHash");
        // console.log(user);
        if (!user) throw new ApiError(401, "Unauthorized: user not found");
        if (!user.active) throw new ApiError(401, "User is not active");

        req.user = user;
        next();
    } catch (err) {
        next(err);
    }
};

// Customer authentication middleware
export const authenticateCustomer = async (req, res, next) => {
    try {
        let token = null;
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
        if (!token && req.cookies) {
            token = req.cookies.customerToken || req.cookies.accessToken;
        }

        if (!token) {
            throw new ApiError(401, "Unauthorized: Customer login required");
        }

        let payload;
        try {
            payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || "CustomerSecretKey");
        } catch (err) {
            throw new ApiError(401, "Session expired or invalid. Please login again.");
        }

        if (payload.role !== "customer") {
            throw new ApiError(403, "Access denied: Not a customer profile");
        }

        const customer = await Customer.findById(payload._id);
        if (!customer) {
            throw new ApiError(401, "Customer profile not found");
        }
        if (!customer.active) {
            throw new ApiError(403, "Customer account is deactivated");
        }

        req.customer = customer;
        next();
    } catch (err) {
        next(err);
    }
};

// role check middleware factory
export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) throw new ApiError(401, "Unauthorized");
            if (!allowedRoles.includes(req.user.role)) {
                throw new ApiError(403, "Forbidden: insufficient permissions");
            }
            next();
        } catch (err) {
            next(err);
        }
    };
};

export const authorizeSystemRoles = (...allowedSystemRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new ApiError(401, "Unauthorized");
            }

            const userSystemRole = req.user.systemRole;

            if (!userSystemRole) {
                throw new ApiError(403, "System role not assigned");
            }

            // Company admin always allowed unless explicitly blocked
            if (userSystemRole === "company_admin") {
                return next();
            }

            if (!allowedSystemRoles.includes(userSystemRole)) {
                throw new ApiError(403, "Forbidden: insufficient permissions");
            }

            next();
        } catch (err) {
            next(err);
        }
    };
};
