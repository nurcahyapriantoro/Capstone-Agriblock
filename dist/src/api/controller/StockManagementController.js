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
const StockManagement_1 = __importDefault(require("../../core/StockManagement"));
const enum_1 = require("../../enum");
const RoleService_1 = __importDefault(require("../../core/RoleService"));
/**
 * Controller for managing product stock operations
 */
class StockManagementController {
    /**
     * Increase stock quantity (stock-in)
     */
    static stockIn(req, res) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId, quantity, reason, details } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        message: "User authentication required"
                    });
                }
                if (!productId || !quantity || !reason) {
                    return res.status(400).json({
                        success: false,
                        message: "Missing required fields: productId, quantity, and reason are required"
                    });
                }
                // Validate quantity
                if (isNaN(Number(quantity)) || Number(quantity) <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Quantity must be a positive number"
                    });
                }
                // Validate reason
                if (!Object.values(enum_1.StockChangeReason).includes(reason)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid stock change reason"
                    });
                }
                // Initialize stock management
                const stockManager = new StockManagement_1.default(productId, userId);
                const initialized = yield stockManager.initialize();
                if (!initialized) {
                    return res.status(500).json({
                        success: false,
                        message: "Failed to initialize stock management"
                    });
                }
                // Perform stock in operation
                const result = yield stockManager.stockIn(Number(quantity), reason, details);
                if (!result.success) {
                    return res.status(400).json(result);
                }
                return res.status(200).json(result);
            }
            catch (error) {
                console.error("Error in stockIn controller:", error);
                return res.status(500).json({
                    success: false,
                    message: "Internal server error"
                });
            }
        });
    }
    /**
     * Decrease stock quantity (stock-out)
     */
    static stockOut(req, res) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId, quantity, reason, details } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        message: "User authentication required"
                    });
                }
                if (!productId || !quantity || !reason) {
                    return res.status(400).json({
                        success: false,
                        message: "Missing required fields: productId, quantity, and reason are required"
                    });
                }
                // Validate quantity
                if (isNaN(Number(quantity)) || Number(quantity) <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Quantity must be a positive number"
                    });
                }
                // Validate reason
                if (!Object.values(enum_1.StockChangeReason).includes(reason)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid stock change reason"
                    });
                }
                // Initialize stock management
                const stockManager = new StockManagement_1.default(productId, userId);
                const initialized = yield stockManager.initialize();
                if (!initialized) {
                    return res.status(500).json({
                        success: false,
                        message: "Failed to initialize stock management"
                    });
                }
                // Perform stock out operation
                const result = yield stockManager.stockOut(Number(quantity), reason, details);
                if (!result.success) {
                    return res.status(400).json(result);
                }
                return res.status(200).json(result);
            }
            catch (error) {
                console.error("Error in stockOut controller:", error);
                return res.status(500).json({
                    success: false,
                    message: "Internal server error"
                });
            }
        });
    }
    /**
     * Adjust stock to specific quantity
     */
    static adjustStock(req, res) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId, newQuantity, reason, details } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        message: "User authentication required"
                    });
                }
                if (!productId || newQuantity === undefined || !reason) {
                    return res.status(400).json({
                        success: false,
                        message: "Missing required fields: productId, newQuantity, and reason are required"
                    });
                }
                // Validate quantity
                if (isNaN(Number(newQuantity)) || Number(newQuantity) < 0) {
                    return res.status(400).json({
                        success: false,
                        message: "New quantity must be a non-negative number"
                    });
                }
                // Validate reason
                if (!Object.values(enum_1.StockChangeReason).includes(reason)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid stock change reason"
                    });
                }
                // Initialize stock management
                const stockManager = new StockManagement_1.default(productId, userId);
                const initialized = yield stockManager.initialize();
                if (!initialized) {
                    return res.status(500).json({
                        success: false,
                        message: "Failed to initialize stock management"
                    });
                }
                // Perform stock adjustment operation
                const result = yield stockManager.adjustStock(Number(newQuantity), reason, details);
                if (!result.success) {
                    return res.status(400).json(result);
                }
                return res.status(200).json(result);
            }
            catch (error) {
                console.error("Error in adjustStock controller:", error);
                return res.status(500).json({
                    success: false,
                    message: "Internal server error"
                });
            }
        });
    }
    /**
     * Transfer stock between users
     */
    static transferStock(req, res) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId, toUserId, quantity, details } = req.body;
                const fromUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!fromUserId) {
                    return res.status(401).json({
                        success: false,
                        message: "User authentication required"
                    });
                }
                if (!productId || !toUserId || !quantity) {
                    return res.status(400).json({
                        success: false,
                        message: "Missing required fields: productId, toUserId, and quantity are required"
                    });
                }
                // Validate quantity
                if (isNaN(Number(quantity)) || Number(quantity) <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Quantity must be a positive number"
                    });
                }
                // Get from user role
                const fromRole = yield RoleService_1.default.getUserRole(fromUserId);
                if (!fromRole) {
                    return res.status(400).json({
                        success: false,
                        message: "Sender role not found"
                    });
                }
                // Get to user role
                const toRole = yield RoleService_1.default.getUserRole(toUserId);
                if (!toRole) {
                    return res.status(400).json({
                        success: false,
                        message: "Recipient role not found"
                    });
                }
                // Perform stock transfer
                const result = yield StockManagement_1.default.transferStock(productId, fromUserId, fromRole, toUserId, toRole, Number(quantity), details);
                if (!result.success) {
                    return res.status(400).json(result);
                }
                return res.status(200).json(result);
            }
            catch (error) {
                console.error("Error in transferStock controller:", error);
                return res.status(500).json({
                    success: false,
                    message: "Internal server error"
                });
            }
        });
    }
    /**
     * Get current stock level
     */
    static getCurrentStock(req, res) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        message: "User authentication required"
                    });
                }
                if (!productId) {
                    return res.status(400).json({
                        success: false,
                        message: "Product ID is required"
                    });
                }
                // Initialize stock management
                const stockManager = new StockManagement_1.default(productId, userId);
                // Get current stock
                const currentStock = yield stockManager.getCurrentStock();
                return res.status(200).json({
                    success: true,
                    productId,
                    currentStock
                });
            }
            catch (error) {
                console.error("Error in getCurrentStock controller:", error);
                return res.status(500).json({
                    success: false,
                    message: "Internal server error"
                });
            }
        });
    }
    /**
     * Get stock transaction history
     */
    static getStockHistory(req, res) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        message: "User authentication required"
                    });
                }
                if (!productId) {
                    return res.status(400).json({
                        success: false,
                        message: "Product ID is required"
                    });
                }
                // Initialize stock management
                const stockManager = new StockManagement_1.default(productId, userId);
                // Get stock history
                const history = yield stockManager.getStockHistory();
                return res.status(200).json({
                    success: true,
                    productId,
                    history
                });
            }
            catch (error) {
                console.error("Error in getStockHistory controller:", error);
                return res.status(500).json({
                    success: false,
                    message: "Internal server error"
                });
            }
        });
    }
    /**
     * Check if product has low stock
     */
    static checkLowStock(req, res) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId } = req.params;
                const { threshold } = req.query;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        message: "User authentication required"
                    });
                }
                if (!productId) {
                    return res.status(400).json({
                        success: false,
                        message: "Product ID is required"
                    });
                }
                // Initialize stock management
                const stockManager = new StockManagement_1.default(productId, userId);
                // Set custom threshold if provided
                if (threshold && !isNaN(Number(threshold))) {
                    stockManager.setLowStockThreshold(Number(threshold));
                }
                // Check if stock is low
                const isLowStock = yield stockManager.isLowStock();
                const currentStock = yield stockManager.getCurrentStock();
                return res.status(200).json({
                    success: true,
                    productId,
                    currentStock,
                    isLowStock
                });
            }
            catch (error) {
                console.error("Error in checkLowStock controller:", error);
                return res.status(500).json({
                    success: false,
                    message: "Internal server error"
                });
            }
        });
    }
}
exports.default = StockManagementController;
