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
const ProductService_1 = __importDefault(require("./ProductService"));
const RoleService_1 = __importDefault(require("./RoleService"));
const TransactionHistory_1 = require("./TransactionHistory");
/**
 * Class for managing product stock throughout the supply chain
 */
class StockManagement {
    constructor(productId, userId) {
        this.lowStockThreshold = 10; // Default low stock threshold
        this.productId = productId;
        this.userId = userId;
    }
    /**
     * Initialize the stock management with user role
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get the user's role
                const role = yield RoleService_1.default.getUserRole(this.userId);
                if (!role) {
                    console.error(`User ${this.userId} role not found`);
                    return false;
                }
                this.userRole = role;
                return true;
            }
            catch (error) {
                console.error("Error initializing StockManagement:", error);
                return false;
            }
        });
    }
    /**
     * Set the threshold for low stock warnings
     * @param threshold Number of units considered low stock
     */
    setLowStockThreshold(threshold) {
        this.lowStockThreshold = threshold;
    }
    /**
     * Increase product stock (stock in)
     * @param quantity Quantity to add
     * @param reason Reason for stock increase
     * @param details Additional details
     * @returns Result of the stock update
     */
    stockIn(quantity, reason, details) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Make sure the instance is initialized
                if (!this.userRole) {
                    const initialized = yield this.initialize();
                    if (!initialized) {
                        return {
                            success: false,
                            message: "Failed to initialize stock management. User role not found."
                        };
                    }
                }
                // Validate quantity
                if (quantity <= 0) {
                    return {
                        success: false,
                        message: "Stock in quantity must be positive."
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
                // Validate permissions - only certain roles can update stock
                if (this.userRole !== enum_1.UserRole.FARMER &&
                    this.userRole !== enum_1.UserRole.COLLECTOR &&
                    this.userRole !== enum_1.UserRole.TRADER &&
                    this.userRole !== enum_1.UserRole.RETAILER) {
                    return {
                        success: false,
                        message: `User with role ${this.userRole} is not authorized to update product stock.`
                    };
                }
                // Check if the user owns the product or has permission to manage its stock
                if (product.ownerId !== this.userId) {
                    return {
                        success: false,
                        message: "Only the current owner can update product stock."
                    };
                }
                // Get current stock level
                const currentStock = (yield TransactionHistory_1.TransactionHistoryService.getCurrentStockLevel(this.productId)) || 0;
                // Calculate new stock level
                const newStock = currentStock + quantity;
                // Record the stock update in transaction history
                const userRole = this.userRole;
                const historyResult = yield TransactionHistory_1.TransactionHistoryService.recordStockChange(this.productId, this.userId, userRole, newStock, // Record the total updated stock level
                enum_1.TransactionActionType.STOCK_IN, reason, Object.assign({ previousStock: currentStock, change: quantity }, details));
                return {
                    success: true,
                    message: `Stock successfully increased by ${quantity} units. New stock level: ${newStock}`,
                    transactionId: historyResult.transactionId,
                    currentStock: newStock
                };
            }
            catch (error) {
                console.error("Error performing stock in:", error);
                return {
                    success: false,
                    message: "Failed to update stock due to an error."
                };
            }
        });
    }
    /**
     * Decrease product stock (stock out)
     * @param quantity Quantity to remove
     * @param reason Reason for stock decrease
     * @param details Additional details
     * @returns Result of the stock update
     */
    stockOut(quantity, reason, details) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Make sure the instance is initialized
                if (!this.userRole) {
                    const initialized = yield this.initialize();
                    if (!initialized) {
                        return {
                            success: false,
                            message: "Failed to initialize stock management. User role not found."
                        };
                    }
                }
                // Validate quantity
                if (quantity <= 0) {
                    return {
                        success: false,
                        message: "Stock out quantity must be positive."
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
                // Validate permissions - only certain roles can update stock
                if (this.userRole !== enum_1.UserRole.FARMER &&
                    this.userRole !== enum_1.UserRole.COLLECTOR &&
                    this.userRole !== enum_1.UserRole.TRADER &&
                    this.userRole !== enum_1.UserRole.RETAILER) {
                    return {
                        success: false,
                        message: `User with role ${this.userRole} is not authorized to update product stock.`
                    };
                }
                // Check if the user owns the product or has permission to manage its stock
                if (product.ownerId !== this.userId) {
                    return {
                        success: false,
                        message: "Only the current owner can update product stock."
                    };
                }
                // Get current stock level
                const currentStock = (yield TransactionHistory_1.TransactionHistoryService.getCurrentStockLevel(this.productId)) || 0;
                // Check if there's enough stock
                if (currentStock < quantity) {
                    return {
                        success: false,
                        message: `Insufficient stock. Current stock: ${currentStock}, Requested: ${quantity}`
                    };
                }
                // Calculate new stock level
                const newStock = currentStock - quantity;
                // Record the stock update in transaction history
                const userRole = this.userRole;
                const historyResult = yield TransactionHistory_1.TransactionHistoryService.recordStockChange(this.productId, this.userId, userRole, newStock, // Record the total updated stock level
                enum_1.TransactionActionType.STOCK_OUT, reason, Object.assign({ previousStock: currentStock, change: -quantity }, details));
                // Check if stock is low after this operation
                const stockWarning = newStock < this.lowStockThreshold
                    ? `Warning: Stock level is low (${newStock} units).`
                    : '';
                return {
                    success: true,
                    message: `Stock successfully decreased by ${quantity} units. New stock level: ${newStock}. ${stockWarning}`,
                    transactionId: historyResult.transactionId,
                    currentStock: newStock
                };
            }
            catch (error) {
                console.error("Error performing stock out:", error);
                return {
                    success: false,
                    message: "Failed to update stock due to an error."
                };
            }
        });
    }
    /**
     * Adjust product stock to a specific level
     * @param newQuantity New quantity to set
     * @param reason Reason for stock adjustment
     * @param details Additional details
     * @returns Result of the stock update
     */
    adjustStock(newQuantity, reason, details) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Make sure the instance is initialized
                if (!this.userRole) {
                    const initialized = yield this.initialize();
                    if (!initialized) {
                        return {
                            success: false,
                            message: "Failed to initialize stock management. User role not found."
                        };
                    }
                }
                // Validate quantity
                if (newQuantity < 0) {
                    return {
                        success: false,
                        message: "Stock quantity cannot be negative."
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
                // Validate permissions - only certain roles can update stock
                if (this.userRole !== enum_1.UserRole.FARMER &&
                    this.userRole !== enum_1.UserRole.COLLECTOR &&
                    this.userRole !== enum_1.UserRole.TRADER &&
                    this.userRole !== enum_1.UserRole.RETAILER) {
                    return {
                        success: false,
                        message: `User with role ${this.userRole} is not authorized to update product stock.`
                    };
                }
                // Check if the user owns the product or has permission to manage its stock
                if (product.ownerId !== this.userId) {
                    return {
                        success: false,
                        message: "Only the current owner can update product stock."
                    };
                }
                // Get current stock level
                const currentStock = (yield TransactionHistory_1.TransactionHistoryService.getCurrentStockLevel(this.productId)) || 0;
                // Calculate the change in stock
                const stockChange = newQuantity - currentStock;
                // Record the stock update in transaction history
                const userRole = this.userRole;
                const historyResult = yield TransactionHistory_1.TransactionHistoryService.recordStockChange(this.productId, this.userId, userRole, newQuantity, // Set to the exact new quantity
                enum_1.TransactionActionType.STOCK_ADJUST, reason, Object.assign({ previousStock: currentStock, change: stockChange }, details));
                // Check if stock is low after this operation
                const stockWarning = newQuantity < this.lowStockThreshold
                    ? `Warning: Stock level is low (${newQuantity} units).`
                    : '';
                const changeDescription = stockChange > 0
                    ? `increased by ${stockChange}`
                    : stockChange < 0
                        ? `decreased by ${Math.abs(stockChange)}`
                        : 'unchanged';
                return {
                    success: true,
                    message: `Stock successfully adjusted to ${newQuantity} units (${changeDescription}). ${stockWarning}`,
                    transactionId: historyResult.transactionId,
                    currentStock: newQuantity
                };
            }
            catch (error) {
                console.error("Error adjusting stock:", error);
                return {
                    success: false,
                    message: "Failed to adjust stock due to an error."
                };
            }
        });
    }
    /**
     * Transfer stock between users when ownership changes
     * @param fromUserId User ID transferring the stock
     * @param toUserId User ID receiving the stock
     * @param quantity Quantity to transfer
     * @param details Additional details
     * @returns Result of the stock transfer
     */
    static transferStock(productId, fromUserId, fromRole, toUserId, toRole, quantity, details) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get product data
                const product = yield ProductService_1.default.getProduct(productId);
                if (!product) {
                    return {
                        success: false,
                        message: `Product with ID ${productId} not found.`
                    };
                }
                // Verify the current owner
                if (product.ownerId !== fromUserId) {
                    return {
                        success: false,
                        message: "Only the current owner can transfer product stock."
                    };
                }
                // Get current stock level
                const currentStock = (yield TransactionHistory_1.TransactionHistoryService.getCurrentStockLevel(productId)) || 0;
                // Check if there's enough stock
                if (currentStock < quantity) {
                    return {
                        success: false,
                        message: `Insufficient stock for transfer. Current stock: ${currentStock}, Requested: ${quantity}`
                    };
                }
                // Record stock out for the sender
                const stockOutResult = yield TransactionHistory_1.TransactionHistoryService.recordStockChange(productId, fromUserId, fromRole, 0, // After transfer, sender has 0 stock
                enum_1.TransactionActionType.STOCK_OUT, enum_1.StockChangeReason.TRANSFER_OUT, Object.assign({ previousStock: currentStock, change: -currentStock, transferTo: toUserId, transferToRole: toRole }, details));
                // Record stock in for the receiver
                const stockInResult = yield TransactionHistory_1.TransactionHistoryService.recordStockChange(productId, toUserId, toRole, quantity, // Receiver gets the transferred quantity
                enum_1.TransactionActionType.STOCK_IN, enum_1.StockChangeReason.TRANSFER_IN, Object.assign({ previousStock: 0, change: quantity, transferFrom: fromUserId, transferFromRole: fromRole }, details));
                return {
                    success: true,
                    message: `Stock successfully transferred. ${quantity} units moved from ${fromUserId} to ${toUserId}.`,
                    transactionId: stockInResult.transactionId,
                    currentStock: quantity
                };
            }
            catch (error) {
                console.error("Error transferring stock:", error);
                return {
                    success: false,
                    message: "Failed to transfer stock due to an error."
                };
            }
        });
    }
    /**
     * Get the current stock level
     * @returns Current stock quantity or 0 if not found
     */
    getCurrentStock() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stockLevel = yield TransactionHistory_1.TransactionHistoryService.getCurrentStockLevel(this.productId);
                return stockLevel || 0;
            }
            catch (error) {
                console.error("Error getting current stock:", error);
                return 0;
            }
        });
    }
    /**
     * Get the stock history for this product
     * @returns Array of stock transaction records
     */
    getStockHistory() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield TransactionHistory_1.TransactionHistoryService.getProductStockHistory(this.productId);
            }
            catch (error) {
                console.error("Error getting stock history:", error);
                return [];
            }
        });
    }
    /**
     * Check if the product has sufficient stock for a requested quantity
     * @param requestedQuantity The quantity to check against available stock
     * @returns Whether there is sufficient stock
     */
    hasSufficientStock(requestedQuantity) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentStock = yield this.getCurrentStock();
            return currentStock >= requestedQuantity;
        });
    }
    /**
     * Check if the product stock is low (below threshold)
     * @returns Whether the stock is low
     */
    isLowStock() {
        return __awaiter(this, void 0, void 0, function* () {
            const currentStock = yield this.getCurrentStock();
            return currentStock < this.lowStockThreshold;
        });
    }
}
exports.default = StockManagement;
