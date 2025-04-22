"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PaymentManagementController_1 = __importDefault(require("../controller/PaymentManagementController"));
const auth_1 = require("../../middleware/auth");
const roleValidator_1 = require("../../middleware/roleValidator");
const enum_1 = require("../../enum");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes
router.use(auth_1.isAuthenticated);
// Create payment endpoint
router.post('/create', (0, roleValidator_1.validateUserRoles)([enum_1.UserRole.FARMER, enum_1.UserRole.COLLECTOR, enum_1.UserRole.TRADER, enum_1.UserRole.RETAILER, enum_1.UserRole.CONSUMER]), PaymentManagementController_1.default.createPayment);
// Get payment history for a product
router.get('/:productId/history', (0, roleValidator_1.validateUserRoles)([enum_1.UserRole.FARMER, enum_1.UserRole.COLLECTOR, enum_1.UserRole.TRADER, enum_1.UserRole.RETAILER]), PaymentManagementController_1.default.getPaymentHistory);
// Get total payments for a product
router.get('/:productId/total', (0, roleValidator_1.validateUserRoles)([enum_1.UserRole.FARMER, enum_1.UserRole.COLLECTOR, enum_1.UserRole.TRADER, enum_1.UserRole.RETAILER]), PaymentManagementController_1.default.getTotalPayments);
// Get payments made by the authenticated user for a product
router.get('/:productId/sent', (0, roleValidator_1.validateUserRoles)([enum_1.UserRole.FARMER, enum_1.UserRole.COLLECTOR, enum_1.UserRole.TRADER, enum_1.UserRole.RETAILER, enum_1.UserRole.CONSUMER]), PaymentManagementController_1.default.getUserPayments);
// Get payments received by the authenticated user for a product
router.get('/:productId/received', (0, roleValidator_1.validateUserRoles)([enum_1.UserRole.FARMER, enum_1.UserRole.COLLECTOR, enum_1.UserRole.TRADER, enum_1.UserRole.RETAILER]), PaymentManagementController_1.default.getUserReceivedPayments);
exports.default = router;
