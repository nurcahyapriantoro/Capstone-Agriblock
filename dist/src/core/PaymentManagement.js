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
exports.PaymentType = exports.PaymentStatus = exports.PaymentManagement = void 0;
const enum_1 = require("../enum");
const ProductService_1 = __importDefault(require("./ProductService"));
const RoleService_1 = __importDefault(require("./RoleService"));
const TransactionHistory_1 = require("./TransactionHistory");
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["COMPLETED"] = "COMPLETED";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
    PaymentStatus["CANCELED"] = "CANCELED";
})(PaymentStatus || (PaymentStatus = {}));
exports.PaymentStatus = PaymentStatus;
var PaymentType;
(function (PaymentType) {
    PaymentType["PRODUCT_PURCHASE"] = "PRODUCT_PURCHASE";
    PaymentType["SERVICE_FEE"] = "SERVICE_FEE";
    PaymentType["ADVANCE_PAYMENT"] = "ADVANCE_PAYMENT";
    PaymentType["PARTIAL_PAYMENT"] = "PARTIAL_PAYMENT";
    PaymentType["FINAL_PAYMENT"] = "FINAL_PAYMENT";
    PaymentType["REFUND"] = "REFUND";
})(PaymentType || (PaymentType = {}));
exports.PaymentType = PaymentType;
/**
 * Class for managing payment transactions in the supply chain
 */
class PaymentManagement {
    constructor(productId, fromUserId) {
        this.productId = productId;
        this.fromUserId = fromUserId;
    }
    /**
     * Initialize the payment management with user role
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get the user's role
                const role = yield RoleService_1.default.getUserRole(this.fromUserId);
                if (!role) {
                    console.error(`User ${this.fromUserId} role not found`);
                    return false;
                }
                this.fromRole = role;
                return true;
            }
            catch (error) {
                console.error("Error initializing PaymentManagement:", error);
                return false;
            }
        });
    }
    /**
     * Create a payment transaction from the current user to another user
     * @param toUserId ID of the payment recipient
     * @param amount Amount to pay
     * @param paymentType Type of payment
     * @param description Payment description
     * @param details Additional payment details
     * @returns Result of the payment transaction
     */
    createPayment(toUserId, amount, paymentType, description, details) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Make sure the instance is initialized
                if (!this.fromRole) {
                    const initialized = yield this.initialize();
                    if (!initialized) {
                        return {
                            success: false,
                            message: "Failed to initialize payment management. User role not found."
                        };
                    }
                }
                // At this point, we know fromRole is defined
                const fromRole = this.fromRole;
                // Validate amount
                if (amount <= 0) {
                    return {
                        success: false,
                        message: "Payment amount must be positive."
                    };
                }
                // Get product data
                const product = yield ProductService_1.default.getProduct(this.productId);
                if (!product) {
                    return {
                        success: false,
                        message: `Product with ID ${this.productId} not found.`
                    };
                }
                // Get recipient's role
                const toRole = yield RoleService_1.default.getUserRole(toUserId);
                if (!toRole) {
                    return {
                        success: false,
                        message: `Recipient with ID ${toUserId} not found or role not defined.`
                    };
                }
                // Validate the payment based on user roles
                const validationResult = this.validatePaymentRoles(fromRole, toRole, paymentType);
                if (!validationResult.valid) {
                    return {
                        success: false,
                        message: validationResult.message
                    };
                }
                // Generate a unique payment ID
                const paymentId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                // Create payment data
                const paymentData = {
                    paymentId,
                    productId: this.productId,
                    amount,
                    fromUserId: this.fromUserId,
                    fromRole,
                    toUserId,
                    toRole,
                    description: description || `Payment for product ${this.productId}`,
                    timestamp: Date.now(),
                    status: PaymentStatus.COMPLETED,
                    details: Object.assign({ paymentType }, details)
                };
                // Record the payment transaction in history
                const historyResult = yield TransactionHistory_1.TransactionHistoryService.recordPaymentTransaction(this.productId, this.fromUserId, fromRole, toUserId, toRole, amount, paymentType, paymentData);
                return {
                    success: true,
                    message: `Payment of ${amount} successfully processed from ${this.fromUserId} to ${toUserId}.`,
                    transactionId: historyResult.transactionId,
                    paymentData
                };
            }
            catch (error) {
                console.error("Error processing payment:", error);
                return {
                    success: false,
                    message: "Failed to process payment due to an error."
                };
            }
        });
    }
    /**
     * Get payment history for the current product
     * @returns Array of payment transactions for the product
     */
    getPaymentHistory() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const paymentHistory = yield TransactionHistory_1.TransactionHistoryService.getProductPaymentHistory(this.productId);
                return paymentHistory.map(record => {
                    var _a, _b, _c;
                    return {
                        paymentId: record.id,
                        productId: record.productId,
                        amount: ((_a = record.details) === null || _a === void 0 ? void 0 : _a.amount) || 0,
                        fromUserId: record.fromUserId,
                        fromRole: record.fromRole,
                        toUserId: record.toUserId,
                        toRole: record.toRole,
                        description: ((_b = record.details) === null || _b === void 0 ? void 0 : _b.description) || '',
                        timestamp: record.timestamp,
                        status: ((_c = record.details) === null || _c === void 0 ? void 0 : _c.status) || PaymentStatus.COMPLETED,
                        details: record.details
                    };
                });
            }
            catch (error) {
                console.error("Error getting payment history:", error);
                return [];
            }
        });
    }
    /**
     * Get total payments made for the current product
     * @returns Total amount paid for the product
     */
    getTotalPayments() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const paymentHistory = yield this.getPaymentHistory();
                return paymentHistory.reduce((total, payment) => {
                    if (payment.status === PaymentStatus.COMPLETED) {
                        return total + payment.amount;
                    }
                    return total;
                }, 0);
            }
            catch (error) {
                console.error("Error calculating total payments:", error);
                return 0;
            }
        });
    }
    /**
     * Get payments made by a specific user for the current product
     * @param userId ID of the user
     * @returns Array of payment transactions made by the user
     */
    getUserPayments(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const paymentHistory = yield this.getPaymentHistory();
                return paymentHistory.filter(payment => payment.fromUserId === userId);
            }
            catch (error) {
                console.error("Error getting user payments:", error);
                return [];
            }
        });
    }
    /**
     * Get payments received by a specific user for the current product
     * @param userId ID of the user
     * @returns Array of payment transactions received by the user
     */
    getUserReceivedPayments(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const paymentHistory = yield this.getPaymentHistory();
                return paymentHistory.filter(payment => payment.toUserId === userId);
            }
            catch (error) {
                console.error("Error getting user received payments:", error);
                return [];
            }
        });
    }
    /**
     * Validate if a payment is allowed between the given user roles
     * @param fromRole Role of the sender
     * @param toRole Role of the recipient
     * @param paymentType Type of payment
     * @returns Validation result
     */
    validatePaymentRoles(fromRole, toRole, paymentType) {
        // Define allowed payment flows based on roles
        const allowedFlows = {
            [PaymentType.PRODUCT_PURCHASE]: [
                { from: enum_1.UserRole.RETAILER, to: enum_1.UserRole.TRADER },
                { from: enum_1.UserRole.TRADER, to: enum_1.UserRole.COLLECTOR },
                { from: enum_1.UserRole.COLLECTOR, to: enum_1.UserRole.FARMER },
                { from: enum_1.UserRole.CONSUMER, to: enum_1.UserRole.RETAILER }
            ],
            [PaymentType.SERVICE_FEE]: [
                // Any role can pay service fees to any other role
                { from: enum_1.UserRole.FARMER, to: enum_1.UserRole.COLLECTOR },
                { from: enum_1.UserRole.FARMER, to: enum_1.UserRole.TRADER },
                { from: enum_1.UserRole.FARMER, to: enum_1.UserRole.RETAILER },
                { from: enum_1.UserRole.COLLECTOR, to: enum_1.UserRole.FARMER },
                { from: enum_1.UserRole.COLLECTOR, to: enum_1.UserRole.TRADER },
                { from: enum_1.UserRole.COLLECTOR, to: enum_1.UserRole.RETAILER },
                { from: enum_1.UserRole.TRADER, to: enum_1.UserRole.FARMER },
                { from: enum_1.UserRole.TRADER, to: enum_1.UserRole.COLLECTOR },
                { from: enum_1.UserRole.TRADER, to: enum_1.UserRole.RETAILER },
                { from: enum_1.UserRole.RETAILER, to: enum_1.UserRole.FARMER },
                { from: enum_1.UserRole.RETAILER, to: enum_1.UserRole.COLLECTOR },
                { from: enum_1.UserRole.RETAILER, to: enum_1.UserRole.TRADER },
                { from: enum_1.UserRole.CONSUMER, to: enum_1.UserRole.RETAILER }
            ],
            [PaymentType.ADVANCE_PAYMENT]: [
                { from: enum_1.UserRole.RETAILER, to: enum_1.UserRole.TRADER },
                { from: enum_1.UserRole.TRADER, to: enum_1.UserRole.COLLECTOR },
                { from: enum_1.UserRole.COLLECTOR, to: enum_1.UserRole.FARMER }
            ],
            [PaymentType.PARTIAL_PAYMENT]: [
                { from: enum_1.UserRole.RETAILER, to: enum_1.UserRole.TRADER },
                { from: enum_1.UserRole.TRADER, to: enum_1.UserRole.COLLECTOR },
                { from: enum_1.UserRole.COLLECTOR, to: enum_1.UserRole.FARMER },
                { from: enum_1.UserRole.CONSUMER, to: enum_1.UserRole.RETAILER }
            ],
            [PaymentType.FINAL_PAYMENT]: [
                { from: enum_1.UserRole.RETAILER, to: enum_1.UserRole.TRADER },
                { from: enum_1.UserRole.TRADER, to: enum_1.UserRole.COLLECTOR },
                { from: enum_1.UserRole.COLLECTOR, to: enum_1.UserRole.FARMER },
                { from: enum_1.UserRole.CONSUMER, to: enum_1.UserRole.RETAILER }
            ],
            [PaymentType.REFUND]: [
                { from: enum_1.UserRole.TRADER, to: enum_1.UserRole.RETAILER },
                { from: enum_1.UserRole.COLLECTOR, to: enum_1.UserRole.TRADER },
                { from: enum_1.UserRole.FARMER, to: enum_1.UserRole.COLLECTOR },
                { from: enum_1.UserRole.RETAILER, to: enum_1.UserRole.CONSUMER }
            ]
        };
        // Check if the payment flow is allowed
        const flows = allowedFlows[paymentType] || [];
        const isAllowed = flows.some(flow => flow.from === fromRole && flow.to === toRole);
        if (!isAllowed) {
            return {
                valid: false,
                message: `Payment of type ${paymentType} from ${fromRole} to ${toRole} is not allowed.`
            };
        }
        return { valid: true };
    }
}
exports.PaymentManagement = PaymentManagement;
