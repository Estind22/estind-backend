// src/middlewares/permission.middleware.js
import { ApiError } from "../utils/ApiError.js";

export const checkPermissions = (required, { allowPrefix = false } = {}) => {
    const requiredList = Array.isArray(required) ? required : [required];

    return (req, res, next) => {
        try {
            // Ensure user logged in
            if (!req.user) throw new ApiError(401, "Unauthorized");

            const { role, permissions } = req.user;

            // 🟢 Admin bypass — full access to everything
            if (role === "admin") {
                return next();
            }

            // Ensure permissions array is valid
            if (!Array.isArray(permissions)) {
                throw new ApiError(403, "Forbidden: permissions not defined for user");
            }

            // Check if user has any of required permissions
            const hasPermission = requiredList.some((reqPerm) => {
                if (permissions.includes(reqPerm)) return true;
                if (allowPrefix) {
                    return permissions.some((p) => p.startsWith(reqPerm));
                }
                return false;
            });

            if (!hasPermission) {
                throw new ApiError(403, `Forbidden: missing permissions (${requiredList.join(", ")})`);
            }

            next();
        } catch (err) {
            next(err);
        }
    };
};
