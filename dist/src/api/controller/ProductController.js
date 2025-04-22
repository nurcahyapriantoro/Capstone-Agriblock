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
exports.transferOwnership = exports.getProductsByOwner = exports.getProduct = exports.createProduct = void 0;
const enum_1 = require("../../enum");
const ProductService_1 = __importDefault(require("../../core/ProductService"));
/**
 * Create a new product (only farmers can do this)
 */
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { farmerId, name, description, quantity, price, metadata, details } = req.body;
        if (!farmerId || !name) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameters: farmerId and name are required"
            });
        }
        const result = yield ProductService_1.default.createProduct(farmerId, {
            name,
            description,
            quantity,
            price,
            metadata
        }, details);
        if (result.success) {
            return res.status(201).json({
                success: true,
                data: {
                    productId: result.productId,
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
        console.error("Error in createProduct:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while creating product"
        });
    }
});
exports.createProduct = createProduct;
/**
 * Get a product by its ID
 */
const getProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameter: productId"
            });
        }
        const product = yield ProductService_1.default.getProduct(productId);
        if (product) {
            return res.status(200).json({
                success: true,
                data: {
                    product
                }
            });
        }
        else {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }
    }
    catch (error) {
        console.error("Error in getProduct:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching product"
        });
    }
});
exports.getProduct = getProduct;
/**
 * Get all products owned by a specific user
 */
const getProductsByOwner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ownerId } = req.params;
        if (!ownerId) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameter: ownerId"
            });
        }
        const products = yield ProductService_1.default.getProductsByOwner(ownerId);
        return res.status(200).json({
            success: true,
            data: {
                products,
                count: products.length
            }
        });
    }
    catch (error) {
        console.error("Error in getProductsByOwner:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching products by owner"
        });
    }
});
exports.getProductsByOwner = getProductsByOwner;
/**
 * Transfer ownership of a product from one user to another
 */
const transferOwnership = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId, currentOwnerId, newOwnerId, role, details } = req.body;
        if (!productId || !currentOwnerId || !newOwnerId || !role) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameters: productId, currentOwnerId, newOwnerId, and role are required"
            });
        }
        // Validate that the role is a valid UserRole
        if (!Object.values(enum_1.UserRole).includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role specified"
            });
        }
        const result = yield ProductService_1.default.transferOwnership({
            productId,
            currentOwnerId,
            newOwnerId,
            role: role,
            details
        });
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
        console.error("Error in transferOwnership:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while transferring product ownership"
        });
    }
});
exports.transferOwnership = transferOwnership;
