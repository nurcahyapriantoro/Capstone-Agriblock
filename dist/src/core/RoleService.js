"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const enum_1 = require("../enum");
const RoleValidation_1 = __importDefault(require("./RoleValidation"));
class RoleService {
    /**
     * Get a user's role from the blockchain or user database
     * @param userId The user's ID or public key
     * @returns The role of the user or null if not found
     */
    static getUserRole(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // In a real implementation, this would query the blockchain or a database
                // to get the user's registered role.
                // This is a simplified implementation for demonstration.
                // You would typically check a user roles database or a special blockchain transaction
                // that registered the user's role.
                // Placeholder implementation
                // In a real scenario, you might check the blockchain for a "REGISTER_ROLE" transaction
                const userRoleData = yield this.getUserRoleFromTransactions(userId);
                return userRoleData;
            }
            catch (error) {
                console.error("Error fetching user role:", error);
                return null;
            }
        });
    }
    /**
     * Example method to get user role from transaction history
     * In a real implementation, this would search the blockchain
     */
    static getUserRoleFromTransactions(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // This is a placeholder. In a real implementation, you would:
                // 1. Query all transactions related to user registration/role assignment
                // 2. Find the most recent valid transaction that sets the user's role
                // 3. Return the role from that transaction
                // For now, returning a mock role for demonstration
                // In a real implementation, you'd query txhashDB or another storage
                // For demo purposes, assign roles based on userId pattern
                if (userId.startsWith("FARM")) {
                    return enum_1.UserRole.FARMER;
                }
                else if (userId.startsWith("COLL")) {
                    return enum_1.UserRole.COLLECTOR;
                }
                else if (userId.startsWith("TRAD")) {
                    return enum_1.UserRole.TRADER;
                }
                else if (userId.startsWith("RET")) {
                    return enum_1.UserRole.RETAILER;
                }
                else if (userId.startsWith("CONS")) {
                    return enum_1.UserRole.CONSUMER;
                }
                return null;
            }
            catch (error) {
                console.error("Error retrieving user role from transactions:", error);
                return null;
            }
        });
    }
    /**
     * Validate if a user can perform a specific action
     * @param userId The user's ID or public key
     * @param action The transaction action to perform
     * @returns Result of validation with status and optional message
     */
    static validateUserAction(userId, action) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get the user's role
            const userRole = yield this.getUserRole(userId);
            if (!userRole) {
                return {
                    isValid: false,
                    message: "User role not found. User may not be registered."
                };
            }
            // Create a validation instance and validate the action
            const validator = new RoleValidation_1.default(userId, userRole, action);
            return validator.validate();
        });
    }
    /**
     * Validate a transaction between two users
     * @param fromUserId The sender's user ID
     * @param toUserId The receiver's user ID
     * @param action The transaction action
     * @returns Result of validation with status and optional message
     */
    static validateTransaction(fromUserId, toUserId, action) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get both users' roles
            const fromRole = yield this.getUserRole(fromUserId);
            const toRole = yield this.getUserRole(toUserId);
            if (!fromRole) {
                return {
                    isValid: false,
                    message: "Sender role not found. User may not be registered."
                };
            }
            if (!toRole) {
                return {
                    isValid: false,
                    message: "Receiver role not found. User may not be registered."
                };
            }
            // Create a validation instance and validate the transaction
            const validator = new RoleValidation_1.default(fromUserId, fromRole, action);
            return validator.validateTransaction(fromRole, toRole);
        });
    }
}
exports.default = RoleService;
