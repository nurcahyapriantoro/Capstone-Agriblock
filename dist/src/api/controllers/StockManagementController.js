"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
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
const tsyringe_1 = require("tsyringe");
const StockManagement_1 = __importDefault(require("../../service/StockManagement"));
// Register StockManagement service in the container
tsyringe_1.container.register("StockManagement", {
    useClass: StockManagement_1.default
});
let StockManagementController = class StockManagementController {
    constructor(stockManagement) {
        this.stockManagement = stockManagement;
    }
    /**
     * Handle stock-in operations
     */
    stockIn(req, res) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId, quantity, reason } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ message: 'User not authenticated' });
                    return;
                }
                if (!productId || !quantity || quantity <= 0) {
                    res.status(400).json({ message: 'Invalid product or quantity' });
                    return;
                }
                yield this.stockManagement.stockIn(userId, productId, quantity, reason || 'Regular stock-in');
                res.status(200).json({ message: 'Stock added successfully' });
            }
            catch (error) {
                console.error('Error in stockIn controller:', error);
                res.status(500).json({ message: error.message || 'Error processing stock-in' });
            }
        });
    }
    /**
     * Handle stock-out operations
     */
    stockOut(req, res) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId, quantity, reason } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ message: 'User not authenticated' });
                    return;
                }
                if (!productId || !quantity || quantity <= 0) {
                    res.status(400).json({ message: 'Invalid product or quantity' });
                    return;
                }
                yield this.stockManagement.stockOut(userId, productId, quantity, reason || 'Regular stock-out');
                res.status(200).json({ message: 'Stock removed successfully' });
            }
            catch (error) {
                console.error('Error in stockOut controller:', error);
                if (error.message === 'Insufficient stock') {
                    res.status(400).json({ message: error.message });
                    return;
                }
                res.status(500).json({ message: error.message || 'Error processing stock-out' });
            }
        });
    }
    /**
     * Handle stock adjustment operations
     */
    adjustStock(req, res) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId, newQuantity, reason } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ message: 'User not authenticated' });
                    return;
                }
                if (!productId || newQuantity === undefined || newQuantity < 0) {
                    res.status(400).json({ message: 'Invalid product or quantity' });
                    return;
                }
                yield this.stockManagement.adjustStock(userId, productId, newQuantity, reason || 'Stock adjustment');
                res.status(200).json({ message: 'Stock adjusted successfully' });
            }
            catch (error) {
                console.error('Error in adjustStock controller:', error);
                res.status(500).json({ message: error.message || 'Error adjusting stock' });
            }
        });
    }
    /**
     * Handle stock transfer operations
     */
    transferStock(req, res) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId, toUserId, quantity, reason } = req.body;
                const fromUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!fromUserId) {
                    res.status(401).json({ message: 'User not authenticated' });
                    return;
                }
                if (!productId || !toUserId || !quantity || quantity <= 0) {
                    res.status(400).json({ message: 'Invalid transfer parameters' });
                    return;
                }
                if (fromUserId === toUserId) {
                    res.status(400).json({ message: 'Cannot transfer to yourself' });
                    return;
                }
                yield this.stockManagement.transferStock(fromUserId, toUserId, productId, quantity, reason || 'Stock transfer');
                res.status(200).json({ message: 'Stock transferred successfully' });
            }
            catch (error) {
                console.error('Error in transferStock controller:', error);
                if (error.message === 'Insufficient stock for transfer') {
                    res.status(400).json({ message: error.message });
                    return;
                }
                res.status(500).json({ message: error.message || 'Error transferring stock' });
            }
        });
    }
    /**
     * Get current stock for a product
     */
    getCurrentStock(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId } = req.params;
                if (!productId) {
                    res.status(400).json({ message: 'Product ID is required' });
                    return;
                }
                const stock = yield this.stockManagement.getCurrentStock(productId);
                res.status(200).json({ productId, stock });
            }
            catch (error) {
                console.error('Error getting current stock:', error);
                res.status(500).json({ message: error.message || 'Error retrieving stock information' });
            }
        });
    }
    /**
     * Get stock history for a product
     */
    getStockHistory(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId } = req.params;
                if (!productId) {
                    res.status(400).json({ message: 'Product ID is required' });
                    return;
                }
                const history = yield this.stockManagement.getStockHistory(productId);
                res.status(200).json(history);
            }
            catch (error) {
                console.error('Error getting stock history:', error);
                res.status(500).json({ message: error.message || 'Error retrieving stock history' });
            }
        });
    }
    /**
     * Check if stock is below threshold
     */
    checkLowStock(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId } = req.params;
                const { threshold = 10 } = req.query;
                if (!productId) {
                    res.status(400).json({ message: 'Product ID is required' });
                    return;
                }
                const thresholdValue = parseInt(threshold) || 10;
                const isLowStock = yield this.stockManagement.checkLowStock(productId, thresholdValue);
                const currentStock = yield this.stockManagement.getCurrentStock(productId);
                res.status(200).json({
                    productId,
                    isLowStock,
                    currentStock,
                    threshold: thresholdValue
                });
            }
            catch (error) {
                console.error('Error checking low stock:', error);
                res.status(500).json({ message: error.message || 'Error checking stock level' });
            }
        });
    }
};
StockManagementController = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)("StockManagement")),
    __metadata("design:paramtypes", [StockManagement_1.default])
], StockManagementController);
exports.default = StockManagementController;
