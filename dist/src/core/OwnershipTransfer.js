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
const RoleService_1 = __importDefault(require("./RoleService"));
/**
 * Class for handling ownership transfer of products between supply chain actors
 * with role-based restrictions
 */
class OwnershipTransfer {
    constructor(productId, currentOwnerId, newOwnerId, role) {
        this.product = null;
        this.productId = productId;
        this.currentOwnerId = currentOwnerId;
        this.newOwnerId = newOwnerId;
        this.role = role;
    }
    /**
     * Set product data for validation
     * @param product The product data for validation
     */
    setProductData(product) {
        this.product = product;
    }
    /**
     * Validate if the current owner can transfer ownership to the new owner
     * based on their roles in the supply chain
     */
    validateTransfer() {
        return __awaiter(this, void 0, void 0, function* () {
            // Verify the product exists
            if (!this.product) {
                return {
                    success: false,
                    message: `Product with ID ${this.productId} not found or data not provided.`
                };
            }
            // Verify that the current owner actually owns the product
            if (this.product.ownerId !== this.currentOwnerId) {
                return {
                    success: false,
                    message: "Current owner does not own this product."
                };
            }
            // Get roles of both parties
            const currentOwnerRole = yield RoleService_1.default.getUserRole(this.currentOwnerId);
            const newOwnerRole = yield RoleService_1.default.getUserRole(this.newOwnerId);
            if (!currentOwnerRole) {
                return {
                    success: false,
                    message: "Current owner role not found. User may not be registered."
                };
            }
            if (!newOwnerRole) {
                return {
                    success: false,
                    message: "New owner role not found. User may not be registered."
                };
            }
            // Verify that the role provided matches the current owner's actual role
            if (currentOwnerRole !== this.role) {
                return {
                    success: false,
                    message: "Provided role does not match the current owner's role."
                };
            }
            // Check if the transfer is allowed based on the roles
            return this.validateRoleBasedTransfer(currentOwnerRole, newOwnerRole);
        });
    }
    /**
     * Validate transfer based on the supply chain role hierarchy
     * @param currentOwnerRole Role of the current owner
     * @param newOwnerRole Role of the new owner
     */
    validateRoleBasedTransfer(currentOwnerRole, newOwnerRole) {
        switch (currentOwnerRole) {
            case enum_1.UserRole.FARMER:
                return this.validateFarmerTransfer(newOwnerRole);
            case enum_1.UserRole.COLLECTOR:
                return this.validateCollectorTransfer(newOwnerRole);
            case enum_1.UserRole.TRADER:
                return this.validateTraderTransfer(newOwnerRole);
            case enum_1.UserRole.RETAILER:
                return this.validateRetailerTransfer(newOwnerRole);
            case enum_1.UserRole.CONSUMER:
                return {
                    success: false,
                    message: "Consumers cannot transfer product ownership."
                };
            default:
                return {
                    success: false,
                    message: "Invalid owner role."
                };
        }
    }
    /**
     * Validate transfers from a Farmer
     * Farmers can only transfer to Collectors
     */
    validateFarmerTransfer(newOwnerRole) {
        if (newOwnerRole !== enum_1.UserRole.COLLECTOR) {
            return {
                success: false,
                message: "Farmers can only transfer products to Collectors."
            };
        }
        return { success: true };
    }
    /**
     * Validate transfers from a Collector
     * Collectors can only transfer to Traders
     */
    validateCollectorTransfer(newOwnerRole) {
        if (newOwnerRole !== enum_1.UserRole.TRADER) {
            return {
                success: false,
                message: "Collectors can only transfer products to Traders."
            };
        }
        return { success: true };
    }
    /**
     * Validate transfers from a Trader
     * Traders can only transfer to Retailers
     */
    validateTraderTransfer(newOwnerRole) {
        if (newOwnerRole !== enum_1.UserRole.RETAILER) {
            return {
                success: false,
                message: "Traders can only transfer products to Retailers."
            };
        }
        return { success: true };
    }
    /**
     * Validate transfers from a Retailer
     * Retailers cannot transfer products to any other role
     */
    validateRetailerTransfer(newOwnerRole) {
        return {
            success: false,
            message: "Retailers cannot transfer products to any other role."
        };
    }
    /**
     * Execute the ownership transfer if it's valid
     * @returns Result of the transfer operation
     */
    executeTransfer() {
        return __awaiter(this, void 0, void 0, function* () {
            // First validate the transfer
            const validationResult = yield this.validateTransfer();
            if (!validationResult.success) {
                return validationResult;
            }
            try {
                // In a real implementation, this would update the product ownership
                // in the blockchain or a database.
                // For now, this is a placeholder implementation
                // Update product ownership
                if (this.product) {
                    this.product.ownerId = this.newOwnerId;
                    // Here you would typically:
                    // 1. Create a blockchain transaction for the ownership transfer
                    // 2. Update product ownership records
                    // 3. Log the transfer in transaction history
                }
                return {
                    success: true,
                    message: `Product ${this.productId} ownership successfully transferred to ${this.newOwnerId}.`
                };
            }
            catch (error) {
                console.error("Error executing transfer:", error);
                return {
                    success: false,
                    message: "Failed to execute ownership transfer due to an error."
                };
            }
        });
    }
}
exports.default = OwnershipTransfer;
