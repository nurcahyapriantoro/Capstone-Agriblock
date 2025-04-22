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
const TransactionHistory_1 = require("./TransactionHistory");
const ProductService_1 = __importDefault(require("./ProductService"));
const RoleService_1 = __importDefault(require("./RoleService"));
/**
 * Class for managing product status updates, recalls, and validations
 */
class ProductManagement {
    constructor(productId, userId) {
        this.productId = productId;
        this.userId = userId;
    }
    /**
     * Initialize the product management with user role
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
                console.error("Error initializing ProductManagement:", error);
                return false;
            }
        });
    }
    /**
     * Update the status of a product
     * @param newStatus New status to set for the product
     * @param details Additional details about the status update
     * @returns Result of the update operation
     */
    updateProductStatus(newStatus, details) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Make sure the instance is initialized
                if (!this.userRole) {
                    const initialized = yield this.initialize();
                    if (!initialized) {
                        return {
                            success: false,
                            message: "Failed to initialize product management. User role not found."
                        };
                    }
                }
                // Get product data
                const product = yield ProductService_1.default.getProduct(this.productId);
                if (!product) {
                    return {
                        success: false,
                        message: `Product with ID ${this.productId} not found.`
                    };
                }
                // Validate permissions - only certain roles can update product status
                if (this.userRole !== enum_1.UserRole.FARMER &&
                    this.userRole !== enum_1.UserRole.COLLECTOR &&
                    this.userRole !== enum_1.UserRole.TRADER &&
                    this.userRole !== enum_1.UserRole.RETAILER) {
                    return {
                        success: false,
                        message: `User with role ${this.userRole} is not authorized to update product status.`
                    };
                }
                // Validate product ownership
                if (product.ownerId !== this.userId) {
                    return {
                        success: false,
                        message: "Only the current owner can update product status."
                    };
                }
                // Update product status in the database/blockchain
                // In a real implementation, this would update the product record
                // For example: await txhashDB.put(`product:${this.productId}`, JSON.stringify({...product, status: newStatus}));
                // Record the status update in transaction history
                const historyResult = yield TransactionHistory_1.TransactionHistoryService.recordProductStatusUpdate(this.productId, this.userId, this.userRole, newStatus, details);
                return {
                    success: true,
                    message: `Product status successfully updated to ${newStatus}.`,
                    transactionId: historyResult.transactionId
                };
            }
            catch (error) {
                console.error("Error updating product status:", error);
                return {
                    success: false,
                    message: "Failed to update product status due to an error."
                };
            }
        });
    }
    /**
     * Recall a product due to issues or concerns
     * @param reason Reason for the product recall
     * @param details Additional details about the recall
     * @returns Result of the recall operation
     */
    recallProduct(reason, details) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Make sure the instance is initialized
                if (!this.userRole) {
                    const initialized = yield this.initialize();
                    if (!initialized) {
                        return {
                            success: false,
                            message: "Failed to initialize product management. User role not found."
                        };
                    }
                }
                // Get product data
                const product = yield ProductService_1.default.getProduct(this.productId);
                if (!product) {
                    return {
                        success: false,
                        message: `Product with ID ${this.productId} not found.`
                    };
                }
                // Validate permissions - only the original creator (FARMER) or current owner can recall
                const isFarmer = this.userRole === enum_1.UserRole.FARMER;
                const isOwner = product.ownerId === this.userId;
                if (!isFarmer && !isOwner) {
                    return {
                        success: false,
                        message: "Only the product creator (farmer) or current owner can recall a product."
                    };
                }
                // Update product status to RECALLED in the database/blockchain
                // In a real implementation, this would update the product record
                // For example: await txhashDB.put(`product:${this.productId}`, JSON.stringify({...product, status: ProductStatus.RECALLED}));
                // Enhanced details with recall reason
                const recallDetails = Object.assign({ reason, recalledBy: this.userId, recallerRole: this.userRole, timestamp: Date.now() }, details);
                // We know userRole is defined here because we checked above and returned if it wasn't
                const userRole = this.userRole;
                // Record the recall in transaction history
                const historyResult = yield TransactionHistory_1.TransactionHistoryService.recordProductRecall(this.productId, this.userId, userRole, reason, recallDetails);
                return {
                    success: true,
                    message: `Product successfully recalled due to ${reason}.`,
                    transactionId: historyResult.transactionId
                };
            }
            catch (error) {
                console.error("Error recalling product:", error);
                return {
                    success: false,
                    message: "Failed to recall product due to an error."
                };
            }
        });
    }
    /**
     * Verify that a product meets quality and safety standards
     * @param criteria Validation criteria to check against
     * @param details Additional details about the verification
     * @returns Result of the verification operation
     */
    verifyProduct(criteria, details) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Make sure the instance is initialized
                if (!this.userRole) {
                    const initialized = yield this.initialize();
                    if (!initialized) {
                        return {
                            success: false,
                            message: "Failed to initialize product management. User role not found."
                        };
                    }
                }
                // Get product data
                const product = yield ProductService_1.default.getProduct(this.productId);
                if (!product) {
                    return {
                        success: false,
                        message: `Product with ID ${this.productId} not found.`
                    };
                }
                // Validate permissions - specific roles might be authorized to verify
                // For example, only COLLECTORS, TRADERS, and quality control roles can verify
                if (this.userRole !== enum_1.UserRole.COLLECTOR &&
                    this.userRole !== enum_1.UserRole.TRADER &&
                    this.userRole !== enum_1.UserRole.FARMER) {
                    return {
                        success: false,
                        message: `User with role ${this.userRole} is not authorized to verify product quality.`
                    };
                }
                // Perform verification against criteria
                const verificationResult = this.checkProductAgainstCriteria(product, criteria);
                if (!verificationResult.passes) {
                    // If verification fails, record the issues
                    const failDetails = Object.assign({ verifiedBy: this.userId, verifierRole: this.userRole, timestamp: Date.now(), status: "FAILED", issues: verificationResult.issues }, details);
                    // We know userRole is defined here because we checked above and returned if it wasn't
                    const userRole = this.userRole;
                    // Record the failed verification in transaction history
                    const historyResult = yield TransactionHistory_1.TransactionHistoryService.recordProductVerification(this.productId, this.userId, userRole, false, failDetails);
                    return {
                        success: false,
                        message: `Product verification failed: ${verificationResult.issues.join(", ")}`,
                        transactionId: historyResult.transactionId
                    };
                }
                // Update product status to VERIFIED in the database/blockchain
                // In a real implementation, this would update the product record
                // For example: await txhashDB.put(`product:${this.productId}`, JSON.stringify({...product, status: ProductStatus.VERIFIED}));
                // Record the successful verification in transaction history
                const passDetails = Object.assign({ verifiedBy: this.userId, verifierRole: this.userRole, timestamp: Date.now(), status: "PASSED" }, details);
                // We know userRole is defined here because we checked above and returned if it wasn't
                const userRole = this.userRole;
                const historyResult = yield TransactionHistory_1.TransactionHistoryService.recordProductVerification(this.productId, this.userId, userRole, true, passDetails);
                return {
                    success: true,
                    message: "Product successfully verified and meets all quality standards.",
                    transactionId: historyResult.transactionId
                };
            }
            catch (error) {
                console.error("Error verifying product:", error);
                return {
                    success: false,
                    message: "Failed to verify product due to an error."
                };
            }
        });
    }
    /**
     * Check product against quality and safety validation criteria
     * @param product Product data to check
     * @param criteria Validation criteria
     * @returns Result of validation checks
     */
    checkProductAgainstCriteria(product, criteria) {
        const issues = [];
        // In a real implementation, these would be thorough checks against product data
        // Check expiration date if provided
        if (criteria.expirationDate && product.expirationDate) {
            const productExpDate = new Date(product.expirationDate);
            const criteriaExpDate = criteria.expirationDate;
            if (productExpDate < criteriaExpDate) {
                issues.push("Product has expired or will expire too soon");
            }
        }
        // Check quality threshold if provided
        if (criteria.qualityThreshold !== undefined && product.qualityScore !== undefined) {
            if (product.qualityScore < criteria.qualityThreshold) {
                issues.push(`Product quality score (${product.qualityScore}) is below threshold (${criteria.qualityThreshold})`);
            }
        }
        // Check safety standards if provided
        if (criteria.safetyStandards && product.safetyCompliance) {
            for (const standard of criteria.safetyStandards) {
                if (!product.safetyCompliance.includes(standard)) {
                    issues.push(`Product does not meet safety standard: ${standard}`);
                }
            }
        }
        // Check required certifications if provided
        if (criteria.requiredCertifications && product.certifications) {
            for (const cert of criteria.requiredCertifications) {
                if (!product.certifications.includes(cert)) {
                    issues.push(`Product is missing required certification: ${cert}`);
                }
            }
        }
        return {
            passes: issues.length === 0,
            issues
        };
    }
}
exports.default = ProductManagement;
