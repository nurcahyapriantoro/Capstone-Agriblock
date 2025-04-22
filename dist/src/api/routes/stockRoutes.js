"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const StockManagementController_1 = __importDefault(require("../controllers/StockManagementController"));
const auth_1 = require("../../middleware/auth");
const tsyringe_1 = require("tsyringe");
const router = express_1.default.Router();
const stockController = tsyringe_1.container.resolve(StockManagementController_1.default);
/**
 * @route   POST /api/stock/in
 * @desc    Add stock for a product
 * @access  Private
 */
router.post('/in', auth_1.authenticateJWT, stockController.stockIn.bind(stockController));
/**
 * @route   POST /api/stock/out
 * @desc    Remove stock for a product
 * @access  Private
 */
router.post('/out', auth_1.authenticateJWT, stockController.stockOut.bind(stockController));
/**
 * @route   POST /api/stock/adjust
 * @desc    Adjust stock to a specific value
 * @access  Private
 */
router.post('/adjust', auth_1.authenticateJWT, stockController.adjustStock.bind(stockController));
/**
 * @route   POST /api/stock/transfer
 * @desc    Transfer stock from one user to another
 * @access  Private
 */
router.post('/transfer', auth_1.authenticateJWT, stockController.transferStock.bind(stockController));
/**
 * @route   GET /api/stock/:productId
 * @desc    Get current stock for a product
 * @access  Private
 */
router.get('/:productId', auth_1.authenticateJWT, stockController.getCurrentStock.bind(stockController));
/**
 * @route   GET /api/stock/:productId/history
 * @desc    Get stock history for a product
 * @access  Private
 */
router.get('/:productId/history', auth_1.authenticateJWT, stockController.getStockHistory.bind(stockController));
/**
 * @route   GET /api/stock/:productId/lowstock
 * @desc    Check if stock is below threshold
 * @access  Private
 */
router.get('/:productId/lowstock', auth_1.authenticateJWT, stockController.checkLowStock.bind(stockController));
exports.default = router;
