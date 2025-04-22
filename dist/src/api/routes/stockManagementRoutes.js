"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const StockManagementController_1 = __importDefault(require("../controller/StockManagementController"));
const auth_1 = require("../../middleware/auth");
const roleValidator_1 = require("../../middleware/roleValidator");
const enum_1 = require("../../enum");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes
router.use(auth_1.isAuthenticated);
// Stock-in endpoint
router.post('/stock-in', (0, roleValidator_1.validateUserRoles)([enum_1.UserRole.FARMER, enum_1.UserRole.COLLECTOR, enum_1.UserRole.TRADER, enum_1.UserRole.RETAILER]), StockManagementController_1.default.stockIn);
// Stock-out endpoint
router.post('/stock-out', (0, roleValidator_1.validateUserRoles)([enum_1.UserRole.FARMER, enum_1.UserRole.COLLECTOR, enum_1.UserRole.TRADER, enum_1.UserRole.RETAILER]), StockManagementController_1.default.stockOut);
// Adjust stock endpoint
router.post('/adjust', (0, roleValidator_1.validateUserRoles)([enum_1.UserRole.FARMER, enum_1.UserRole.COLLECTOR, enum_1.UserRole.TRADER, enum_1.UserRole.RETAILER]), StockManagementController_1.default.adjustStock);
// Transfer stock endpoint
router.post('/transfer', (0, roleValidator_1.validateUserRoles)([enum_1.UserRole.FARMER, enum_1.UserRole.COLLECTOR, enum_1.UserRole.TRADER, enum_1.UserRole.RETAILER]), StockManagementController_1.default.transferStock);
// Get current stock level
router.get('/:productId', (0, roleValidator_1.validateUserRoles)([enum_1.UserRole.FARMER, enum_1.UserRole.COLLECTOR, enum_1.UserRole.TRADER, enum_1.UserRole.RETAILER, enum_1.UserRole.CONSUMER]), StockManagementController_1.default.getCurrentStock);
// Get stock history
router.get('/:productId/history', (0, roleValidator_1.validateUserRoles)([enum_1.UserRole.FARMER, enum_1.UserRole.COLLECTOR, enum_1.UserRole.TRADER, enum_1.UserRole.RETAILER]), StockManagementController_1.default.getStockHistory);
// Check low stock
router.get('/:productId/low-stock', (0, roleValidator_1.validateUserRoles)([enum_1.UserRole.FARMER, enum_1.UserRole.COLLECTOR, enum_1.UserRole.TRADER, enum_1.UserRole.RETAILER]), StockManagementController_1.default.checkLowStock);
exports.default = router;
