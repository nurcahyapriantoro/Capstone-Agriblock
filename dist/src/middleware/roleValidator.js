"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUserRoles = void 0;
/**
 * Middleware to validate user roles
 * @param allowedRoles Array of roles that are allowed to access the route
 */
const validateUserRoles = (allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: "Authentication required"
                });
                return;
            }
            const userRole = req.user.role;
            if (!allowedRoles.includes(userRole)) {
                res.status(403).json({
                    success: false,
                    message: "You don't have permission to access this resource"
                });
                return;
            }
            next();
        }
        catch (error) {
            console.error('Role validation error:', error);
            res.status(500).json({
                success: false,
                message: "Error validating user role"
            });
        }
    };
};
exports.validateUserRoles = validateUserRoles;
