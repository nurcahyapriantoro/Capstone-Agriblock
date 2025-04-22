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
Object.defineProperty(exports, "__esModule", { value: true });
const PaymentManagement_1 = require("../../core/PaymentManagement");
/**
 * Controller for managing payment transactions
 */
class PaymentManagementController {
    /**
     * Create a new payment transaction
     */
    static createPayment(req, res) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId, toUserId, amount, paymentType, description, details } = req.body;
                const fromUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!fromUserId) {
                    return res.status(401).json({
                        success: false,
                        message: "User authentication required"
                    });
                }
                if (!productId || !toUserId || !amount || !paymentType) {
                    return res.status(400).json({
                        success: false,
                        message: "Missing required fields: productId, toUserId, amount, and paymentType are required"
                    });
                }
                // Validate amount
                if (isNaN(Number(amount)) || Number(amount) <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Amount must be a positive number"
                    });
                }
                // Validate payment type
                if (!Object.values(PaymentManagement_1.PaymentType).includes(paymentType)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid payment type"
                    });
                }
                // Initialize payment management
                const paymentManager = new PaymentManagement_1.PaymentManagement(productId, fromUserId);
                const initialized = yield paymentManager.initialize();
                if (!initialized) {
                    return res.status(500).json({
                        success: false,
                        message: "Failed to initialize payment management"
                    });
                }
                // Create payment
                const result = yield paymentManager.createPayment(toUserId, Number(amount), paymentType, description, details);
                if (!result.success) {
                    return res.status(400).json(result);
                }
                return res.status(200).json(result);
            }
            catch (error) {
                console.error("Error in createPayment controller:", error);
                return res.status(500).json({
                    success: false,
                    message: "Internal server error"
                });
            }
        });
    }
    /**
     * Get payment history for a product
     */
    static getPaymentHistory(req, res) {
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
                // Initialize payment management
                const paymentManager = new PaymentManagement_1.PaymentManagement(productId, userId);
                // Get payment history
                const history = yield paymentManager.getPaymentHistory();
                return res.status(200).json({
                    success: true,
                    productId,
                    history
                });
            }
            catch (error) {
                console.error("Error in getPaymentHistory controller:", error);
                return res.status(500).json({
                    success: false,
                    message: "Internal server error"
                });
            }
        });
    }
    /**
     * Get total payments for a product
     */
    static getTotalPayments(req, res) {
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
                // Initialize payment management
                const paymentManager = new PaymentManagement_1.PaymentManagement(productId, userId);
                // Get total payments
                const totalAmount = yield paymentManager.getTotalPayments();
                return res.status(200).json({
                    success: true,
                    productId,
                    totalAmount
                });
            }
            catch (error) {
                console.error("Error in getTotalPayments controller:", error);
                return res.status(500).json({
                    success: false,
                    message: "Internal server error"
                });
            }
        });
    }
    /**
     * Get payments made by a user for a product
     */
    static getUserPayments(req, res) {
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
                // Initialize payment management
                const paymentManager = new PaymentManagement_1.PaymentManagement(productId, userId);
                // Get user payments
                const payments = yield paymentManager.getUserPayments(userId);
                return res.status(200).json({
                    success: true,
                    productId,
                    userId,
                    payments
                });
            }
            catch (error) {
                console.error("Error in getUserPayments controller:", error);
                return res.status(500).json({
                    success: false,
                    message: "Internal server error"
                });
            }
        });
    }
    /**
     * Get payments received by a user for a product
     */
    static getUserReceivedPayments(req, res) {
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
                // Initialize payment management
                const paymentManager = new PaymentManagement_1.PaymentManagement(productId, userId);
                // Get user received payments
                const payments = yield paymentManager.getUserReceivedPayments(userId);
                return res.status(200).json({
                    success: true,
                    productId,
                    userId,
                    payments
                });
            }
            catch (error) {
                console.error("Error in getUserReceivedPayments controller:", error);
                return res.status(500).json({
                    success: false,
                    message: "Internal server error"
                });
            }
        });
    }
}
exports.default = PaymentManagementController;
