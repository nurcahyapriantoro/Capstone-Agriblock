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
exports.getProductStatus = exports.getRecalledProducts = exports.verifyProduct = exports.recallProduct = exports.updateProductStatus = void 0;
const enum_1 = require("../../enum");
const ProductManagement_1 = __importDefault(require("../../core/ProductManagement"));
const TransactionHistory_1 = require("../../core/TransactionHistory");
/**
 * Update the status of a product
 */
const updateProductStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId, userId, status, details } = req.body;
        if (!productId || !userId || !status) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameters: productId, userId, and status are required"
            });
        }
        // Validate that the status is a valid ProductStatus
        if (!Object.values(enum_1.ProductStatus).includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status specified"
            });
        }
        // Create product management instance
        const productManagement = new ProductManagement_1.default(productId, userId);
        // Update product status
        const result = yield productManagement.updateProductStatus(status, details);
        if (result.success) {
            return res.status(200).json({
                success: true,
                data: {
                    transactionId: result.transactionId
                },
                message: result.message
            });
        }
        else {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }
    }
    catch (error) {
        console.error("Error in updateProductStatus:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while updating product status"
        });
    }
});
exports.updateProductStatus = updateProductStatus;
/**
 * Recall a product
 */
const recallProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId, userId, reason, details } = req.body;
        if (!productId || !userId || !reason) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameters: productId, userId, and reason are required"
            });
        }
        // Validate that the reason is a valid RecallReason
        if (!Object.values(enum_1.RecallReason).includes(reason)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recall reason specified"
            });
        }
        // Create product management instance
        const productManagement = new ProductManagement_1.default(productId, userId);
        // Recall the product
        const result = yield productManagement.recallProduct(reason, details);
        if (result.success) {
            return res.status(200).json({
                success: true,
                data: {
                    transactionId: result.transactionId
                },
                message: result.message
            });
        }
        else {
            return res.status(403).json({
                success: false,
                message: result.message
            });
        }
    }
    catch (error) {
        console.error("Error in recallProduct:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while recalling product"
        });
    }
});
exports.recallProduct = recallProduct;
/**
 * Verify a product against quality and safety standards
 */
const verifyProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId, userId, criteria, details } = req.body;
        if (!productId || !userId || !criteria) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameters: productId, userId, and criteria are required"
            });
        }
        // Validate criteria structure (at minimum it should be an object)
        if (typeof criteria !== 'object' || criteria === null) {
            return res.status(400).json({
                success: false,
                message: "Invalid criteria format. Object expected."
            });
        }
        // Create product management instance
        const productManagement = new ProductManagement_1.default(productId, userId);
        // Process dates if they exist in the criteria
        const processedCriteria = Object.assign({}, criteria);
        if (criteria.expirationDate) {
            processedCriteria.expirationDate = new Date(criteria.expirationDate);
        }
        // Verify the product
        const result = yield productManagement.verifyProduct(processedCriteria, details);
        if (result.success) {
            return res.status(200).json({
                success: true,
                data: {
                    transactionId: result.transactionId
                },
                message: result.message
            });
        }
        else {
            return res.status(400).json({
                success: false,
                message: result.message,
                data: {
                    transactionId: result.transactionId
                }
            });
        }
    }
    catch (error) {
        console.error("Error in verifyProduct:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while verifying product"
        });
    }
});
exports.verifyProduct = verifyProduct;
/**
 * Get all recalled products
 */
const getRecalledProducts = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const recalledProducts = yield TransactionHistory_1.TransactionHistoryService.getRecalledProducts();
        return res.status(200).json({
            success: true,
            data: {
                products: recalledProducts,
                count: recalledProducts.length
            }
        });
    }
    catch (error) {
        console.error("Error in getRecalledProducts:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching recalled products"
        });
    }
});
exports.getRecalledProducts = getRecalledProducts;
/**
 * Get the latest status of a product
 */
const getProductStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameter: productId"
            });
        }
        const statusRecord = yield TransactionHistory_1.TransactionHistoryService.getLatestProductStatus(productId);
        if (statusRecord) {
            return res.status(200).json({
                success: true,
                data: {
                    productId,
                    status: statusRecord.productStatus,
                    lastUpdated: new Date(statusRecord.timestamp),
                    transactionId: statusRecord.id,
                    details: statusRecord.details
                }
            });
        }
        else {
            return res.status(404).json({
                success: false,
                message: "Product status not found"
            });
        }
    }
    catch (error) {
        console.error("Error in getProductStatus:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching product status"
        });
    }
});
exports.getProductStatus = getProductStatus;
