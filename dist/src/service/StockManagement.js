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
const ProductService_1 = __importDefault(require("../core/ProductService"));
const RoleService_1 = __importDefault(require("../core/RoleService"));
const TransactionHistory_1 = require("../core/TransactionHistory");
class StockManagement {
    /**
     * Increase stock quantity
     */
    stockIn(userId, productId, quantity, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if product exists
                const product = yield ProductService_1.default.getProduct(productId);
                if (!product) {
                    throw new Error('Product not found');
                }
                // Get current stock level
                const currentStock = (yield TransactionHistory_1.TransactionHistoryService.getCurrentStockLevel(productId)) || 0;
                const newStock = currentStock + quantity;
                // Get user role
                const userRole = yield RoleService_1.default.getUserRole(userId);
                if (!userRole) {
                    throw new Error('User role not found');
                }
                // Record stock transaction
                const stockTransaction = {
                    productId,
                    userId,
                    quantity,
                    transactionType: enum_1.TransactionActionType.STOCK_IN,
                    previousStock: currentStock,
                    newStock,
                    reason,
                    timestamp: new Date()
                };
                // Store transaction in history
                yield TransactionHistory_1.TransactionHistoryService.recordStockChange(productId, userId, userRole, newStock, enum_1.TransactionActionType.STOCK_IN, reason, {
                    previousStock: currentStock,
                    change: quantity
                });
                return true;
            }
            catch (error) {
                console.error('Error in stockIn:', error);
                throw error;
            }
        });
    }
    /**
     * Decrease stock quantity
     */
    stockOut(userId, productId, quantity, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if product exists
                const product = yield ProductService_1.default.getProduct(productId);
                if (!product) {
                    throw new Error('Product not found');
                }
                // Check if stock is sufficient
                const currentStock = (yield TransactionHistory_1.TransactionHistoryService.getCurrentStockLevel(productId)) || 0;
                if (currentStock < quantity) {
                    throw new Error('Insufficient stock');
                }
                const newStock = currentStock - quantity;
                // Get user role
                const userRole = yield RoleService_1.default.getUserRole(userId);
                if (!userRole) {
                    throw new Error('User role not found');
                }
                // Record stock transaction
                const stockTransaction = {
                    productId,
                    userId,
                    quantity,
                    transactionType: enum_1.TransactionActionType.STOCK_OUT,
                    previousStock: currentStock,
                    newStock,
                    reason,
                    timestamp: new Date()
                };
                // Store transaction in history
                yield TransactionHistory_1.TransactionHistoryService.recordStockChange(productId, userId, userRole, newStock, enum_1.TransactionActionType.STOCK_OUT, reason, {
                    previousStock: currentStock,
                    change: -quantity
                });
                return true;
            }
            catch (error) {
                console.error('Error in stockOut:', error);
                throw error;
            }
        });
    }
    /**
     * Adjust stock to a specific quantity
     */
    adjustStock(userId, productId, newQuantity, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if product exists
                const product = yield ProductService_1.default.getProduct(productId);
                if (!product) {
                    throw new Error('Product not found');
                }
                const currentStock = (yield TransactionHistory_1.TransactionHistoryService.getCurrentStockLevel(productId)) || 0;
                // Get user role
                const userRole = yield RoleService_1.default.getUserRole(userId);
                if (!userRole) {
                    throw new Error('User role not found');
                }
                // Determine if this is an increase or decrease
                const stockChange = newQuantity - currentStock;
                // Record stock transaction
                const stockTransaction = {
                    productId,
                    userId,
                    quantity: Math.abs(stockChange),
                    transactionType: enum_1.TransactionActionType.STOCK_ADJUST,
                    previousStock: currentStock,
                    newStock: newQuantity,
                    reason,
                    timestamp: new Date()
                };
                // Store transaction in history
                yield TransactionHistory_1.TransactionHistoryService.recordStockChange(productId, userId, userRole, newQuantity, enum_1.TransactionActionType.STOCK_ADJUST, reason, {
                    previousStock: currentStock,
                    change: stockChange
                });
                return true;
            }
            catch (error) {
                console.error('Error in adjustStock:', error);
                throw error;
            }
        });
    }
    /**
     * Transfer stock from one user to another
     */
    transferStock(fromUserId, toUserId, productId, quantity, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if product exists
                const product = yield ProductService_1.default.getProduct(productId);
                if (!product) {
                    throw new Error('Product not found');
                }
                // Check if stock is sufficient
                const currentStock = (yield TransactionHistory_1.TransactionHistoryService.getCurrentStockLevel(productId)) || 0;
                if (currentStock < quantity) {
                    throw new Error('Insufficient stock for transfer');
                }
                // Get user roles
                const fromRole = yield RoleService_1.default.getUserRole(fromUserId);
                const toRole = yield RoleService_1.default.getUserRole(toUserId);
                if (!fromRole || !toRole) {
                    throw new Error('User role not found');
                }
                // Record stock-out from source user
                yield TransactionHistory_1.TransactionHistoryService.recordStockChange(productId, fromUserId, fromRole, 0, // After transfer, sender has 0 stock
                enum_1.TransactionActionType.STOCK_OUT, enum_1.StockChangeReason.TRANSFER_OUT, {
                    previousStock: currentStock,
                    change: -currentStock,
                    transferTo: toUserId,
                    transferToRole: toRole
                });
                // Record stock-in to destination user
                yield TransactionHistory_1.TransactionHistoryService.recordStockChange(productId, toUserId, toRole, quantity, // Receiver gets the transferred quantity
                enum_1.TransactionActionType.STOCK_IN, enum_1.StockChangeReason.TRANSFER_IN, {
                    previousStock: 0,
                    change: quantity,
                    transferFrom: fromUserId,
                    transferFromRole: fromRole
                });
                return true;
            }
            catch (error) {
                console.error('Error in transferStock:', error);
                throw error;
            }
        });
    }
    /**
     * Get current stock for a product
     */
    getCurrentStock(productId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get product's current stock
                const currentStock = yield TransactionHistory_1.TransactionHistoryService.getCurrentStockLevel(productId);
                return currentStock || 0;
            }
            catch (error) {
                console.error('Error getting current stock:', error);
                throw error;
            }
        });
    }
    /**
     * Get stock transaction history for a product
     */
    getStockHistory(productId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const history = yield TransactionHistory_1.TransactionHistoryService.getProductStockHistory(productId);
                return history;
            }
            catch (error) {
                console.error('Error getting stock history:', error);
                throw error;
            }
        });
    }
    /**
     * Check if stock is below threshold
     */
    checkLowStock(productId, threshold) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const currentStock = yield this.getCurrentStock(productId);
                return currentStock < threshold;
            }
            catch (error) {
                console.error('Error checking low stock:', error);
                throw error;
            }
        });
    }
}
exports.default = StockManagement;
