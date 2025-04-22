"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const enum_1 = require("../enum");
class RoleValidation {
    constructor(userId, role, transactionType) {
        this.userId = userId;
        this.role = role;
        this.transactionType = transactionType;
    }
    /**
     * Validates if a user with a specific role can perform the requested transaction action
     * @returns Validation result with status and optional message
     */
    validate() {
        switch (this.role) {
            case enum_1.UserRole.FARMER:
                return this.validateFarmer();
            case enum_1.UserRole.COLLECTOR:
                return this.validateCollector();
            case enum_1.UserRole.TRADER:
                return this.validateTrader();
            case enum_1.UserRole.RETAILER:
                return this.validateRetailer();
            case enum_1.UserRole.CONSUMER:
                return this.validateConsumer();
            default:
                return {
                    isValid: false,
                    message: "Invalid role specified."
                };
        }
    }
    validateFarmer() {
        // Farmers can only add new products
        if (this.transactionType === enum_1.TransactionAction.ADD_PRODUCT) {
            return { isValid: true };
        }
        // Farmers can also view history
        if (this.transactionType === enum_1.TransactionAction.VIEW_HISTORY) {
            return { isValid: true };
        }
        return {
            isValid: false,
            message: "Farmers can only add new products or view history."
        };
    }
    validateCollector() {
        // Collectors can buy from farmers and sell to traders
        if (this.transactionType === enum_1.TransactionAction.BUY_PRODUCT ||
            this.transactionType === enum_1.TransactionAction.SELL_PRODUCT) {
            return { isValid: true };
        }
        // Collectors can also view history
        if (this.transactionType === enum_1.TransactionAction.VIEW_HISTORY) {
            return { isValid: true };
        }
        return {
            isValid: false,
            message: "Collectors can only buy products from farmers, sell to traders, or view history."
        };
    }
    validateTrader() {
        // Traders can buy from collectors and sell to retailers
        if (this.transactionType === enum_1.TransactionAction.BUY_PRODUCT ||
            this.transactionType === enum_1.TransactionAction.SELL_PRODUCT) {
            return { isValid: true };
        }
        // Traders can also view history
        if (this.transactionType === enum_1.TransactionAction.VIEW_HISTORY) {
            return { isValid: true };
        }
        return {
            isValid: false,
            message: "Traders can only buy products from collectors, sell to retailers, or view history."
        };
    }
    validateRetailer() {
        // Retailers can only buy from traders
        if (this.transactionType === enum_1.TransactionAction.BUY_PRODUCT) {
            return { isValid: true };
        }
        // Retailers can also view history
        if (this.transactionType === enum_1.TransactionAction.VIEW_HISTORY) {
            return { isValid: true };
        }
        return {
            isValid: false,
            message: "Retailers can only buy products from traders or view history."
        };
    }
    validateConsumer() {
        // Consumers can only view history
        if (this.transactionType === enum_1.TransactionAction.VIEW_HISTORY) {
            return { isValid: true };
        }
        return {
            isValid: false,
            message: "Consumers can only view product and transaction history."
        };
    }
    /**
     * Extended validation that checks both role permissions and validates
     * the specific transaction parties (from/to) based on their roles
     */
    validateTransaction(fromRole, toRole) {
        // First check if the action is valid for this role
        const basicValidation = this.validate();
        if (!basicValidation.isValid) {
            return basicValidation;
        }
        // Now check if the transaction parties are valid for this action
        switch (this.transactionType) {
            case enum_1.TransactionAction.SELL_PRODUCT:
                return this.validateSellTransaction(fromRole, toRole);
            case enum_1.TransactionAction.BUY_PRODUCT:
                return this.validateBuyTransaction(fromRole, toRole);
            default:
                return basicValidation;
        }
    }
    validateSellTransaction(fromRole, toRole) {
        // Validate that the seller is selling to the correct type of buyer
        switch (fromRole) {
            case enum_1.UserRole.FARMER:
                if (toRole !== enum_1.UserRole.COLLECTOR) {
                    return {
                        isValid: false,
                        message: "Farmers can only sell to collectors."
                    };
                }
                break;
            case enum_1.UserRole.COLLECTOR:
                if (toRole !== enum_1.UserRole.TRADER) {
                    return {
                        isValid: false,
                        message: "Collectors can only sell to traders."
                    };
                }
                break;
            case enum_1.UserRole.TRADER:
                if (toRole !== enum_1.UserRole.RETAILER) {
                    return {
                        isValid: false,
                        message: "Traders can only sell to retailers."
                    };
                }
                break;
            default:
                return {
                    isValid: false,
                    message: "Invalid seller role for this transaction."
                };
        }
        return { isValid: true };
    }
    validateBuyTransaction(fromRole, toRole) {
        // Validate that the buyer is buying from the correct type of seller
        switch (toRole) {
            case enum_1.UserRole.COLLECTOR:
                if (fromRole !== enum_1.UserRole.FARMER) {
                    return {
                        isValid: false,
                        message: "Collectors can only buy from farmers."
                    };
                }
                break;
            case enum_1.UserRole.TRADER:
                if (fromRole !== enum_1.UserRole.COLLECTOR) {
                    return {
                        isValid: false,
                        message: "Traders can only buy from collectors."
                    };
                }
                break;
            case enum_1.UserRole.RETAILER:
                if (fromRole !== enum_1.UserRole.TRADER) {
                    return {
                        isValid: false,
                        message: "Retailers can only buy from traders."
                    };
                }
                break;
            default:
                return {
                    isValid: false,
                    message: "Invalid buyer role for this transaction."
                };
        }
        return { isValid: true };
    }
}
exports.default = RoleValidation;
