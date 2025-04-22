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
exports.getUserRole = exports.validateTransaction = exports.validateUserAction = void 0;
const enum_1 = require("../../enum");
const RoleService_1 = __importDefault(require("../../core/RoleService"));
/**
 * Validate if a user can perform a specific action
 */
const validateUserAction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, action } = req.body;
        if (!userId || !action) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameters: userId and action are required"
            });
        }
        // Validate that the action is a valid TransactionAction
        if (!Object.values(enum_1.TransactionAction).includes(action)) {
            return res.status(400).json({
                success: false,
                message: "Invalid action specified"
            });
        }
        const validationResult = yield RoleService_1.default.validateUserAction(userId, action);
        if (validationResult.isValid) {
            return res.status(200).json({
                success: true,
                message: "User is authorized to perform this action"
            });
        }
        else {
            return res.status(403).json({
                success: false,
                message: validationResult.message || "User is not authorized to perform this action"
            });
        }
    }
    catch (error) {
        console.error("Error in validateUserAction:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while validating user action"
        });
    }
});
exports.validateUserAction = validateUserAction;
/**
 * Validate a transaction between two users
 */
const validateTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fromUserId, toUserId, action } = req.body;
        if (!fromUserId || !toUserId || !action) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameters: fromUserId, toUserId, and action are required"
            });
        }
        // Validate that the action is a valid TransactionAction
        if (!Object.values(enum_1.TransactionAction).includes(action)) {
            return res.status(400).json({
                success: false,
                message: "Invalid action specified"
            });
        }
        const validationResult = yield RoleService_1.default.validateTransaction(fromUserId, toUserId, action);
        if (validationResult.isValid) {
            return res.status(200).json({
                success: true,
                message: "Transaction is valid based on user roles"
            });
        }
        else {
            return res.status(403).json({
                success: false,
                message: validationResult.message || "Transaction is not valid based on user roles"
            });
        }
    }
    catch (error) {
        console.error("Error in validateTransaction:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while validating transaction"
        });
    }
});
exports.validateTransaction = validateTransaction;
/**
 * Get a user's role
 */
const getUserRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameter: userId"
            });
        }
        const role = yield RoleService_1.default.getUserRole(userId);
        if (role) {
            return res.status(200).json({
                success: true,
                data: {
                    userId,
                    role
                }
            });
        }
        else {
            return res.status(404).json({
                success: false,
                message: "User role not found. User may not be registered."
            });
        }
    }
    catch (error) {
        console.error("Error in getUserRole:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while retrieving user role"
        });
    }
});
exports.getUserRole = getUserRole;
