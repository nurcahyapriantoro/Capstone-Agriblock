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
const OwnershipTransfer_1 = __importDefault(require("./OwnershipTransfer"));
const RoleService_1 = __importDefault(require("./RoleService"));
const TransactionHistory_1 = require("./TransactionHistory");
/**
 * Service for managing products and their ownership
 */
class ProductService {
    /**
     * Get product by ID
     * @param productId ID of the product to retrieve
     * @returns Product data or null if not found
     */
    static getProduct(productId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // In a real implementation, this would query the blockchain or database
                // for the product data. This is a placeholder implementation.
                // Example: Query the blockchain for product data
                // const productData = await txhashDB.get(`product:${productId}`).then(data => JSON.parse(data));
                // Placeholder implementation - this would be replaced with actual data fetching
                const mockProductData = {
                    id: productId,
                    ownerId: "",
                    name: "Sample Product",
                    description: "This is a placeholder product",
                    quantity: 1,
                    price: 100,
                    metadata: {},
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };
                return mockProductData;
            }
            catch (error) {
                console.error("Error fetching product:", error);
                return null;
            }
        });
    }
    /**
     * Validate and execute a product ownership transfer
     * @param params Parameters for the ownership transfer
     * @returns Result of the transfer operation
     */
    static transferOwnership(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { productId, currentOwnerId, newOwnerId, role, details } = params;
            // Get product data
            const productData = yield this.getProduct(productId);
            if (!productData) {
                return {
                    success: false,
                    message: `Product with ID ${productId} not found.`
                };
            }
            // Create an ownership transfer instance
            const ownershipTransfer = new OwnershipTransfer_1.default(productId, currentOwnerId, newOwnerId, role);
            // Set the product data for validation
            ownershipTransfer.setProductData(productData);
            // Execute the transfer
            const transferResult = yield ownershipTransfer.executeTransfer();
            // If transfer is successful, record it in the transaction history
            if (transferResult.success) {
                // Get the roles of both parties
                const fromRole = yield RoleService_1.default.getUserRole(currentOwnerId);
                const toRole = yield RoleService_1.default.getUserRole(newOwnerId);
                if (fromRole && toRole) {
                    // Record the transfer in transaction history
                    const historyResult = yield TransactionHistory_1.TransactionHistoryService.recordProductTransfer(productId, currentOwnerId, fromRole, newOwnerId, toRole, details);
                    if (historyResult.success) {
                        return {
                            success: true,
                            message: transferResult.message,
                            transactionId: historyResult.transactionId
                        };
                    }
                }
            }
            return transferResult;
        });
    }
    /**
     * Create a new product with the farmer as the initial owner
     * @param farmerId ID of the farmer creating the product
     * @param productData Product data to be created
     * @returns Result of the product creation
     */
    static createProduct(farmerId, productData, details) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Verify that the creator is a farmer
                const farmerRole = yield RoleService_1.default.getUserRole(farmerId);
                if (farmerRole !== enum_1.UserRole.FARMER) {
                    return {
                        success: false,
                        message: "Only farmers can create new products."
                    };
                }
                // Generate a unique product ID
                const productId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                // Create the product
                const newProduct = Object.assign(Object.assign({ id: productId, ownerId: farmerId }, productData), { createdAt: Date.now(), updatedAt: Date.now() });
                // In a real implementation, this would store the product in the blockchain
                // Example: await txhashDB.put(`product:${productId}`, JSON.stringify(newProduct));
                // Record the product creation in transaction history
                const productDetails = Object.assign({ name: productData.name, description: productData.description, quantity: productData.quantity, price: productData.price }, details);
                const historyResult = yield TransactionHistory_1.TransactionHistoryService.recordProductCreation(productId, farmerId, productDetails);
                return {
                    success: true,
                    productId,
                    message: "Product created successfully.",
                    transactionId: historyResult.transactionId
                };
            }
            catch (error) {
                console.error("Error creating product:", error);
                return {
                    success: false,
                    message: "Failed to create product due to an error."
                };
            }
        });
    }
    /**
     * Get all products owned by a specific user
     * @param ownerId ID of the product owner
     * @returns Array of products owned by the user
     */
    static getProductsByOwner(ownerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // In a real implementation, this would query the blockchain or database
                // for all products owned by the specified user.
                // This is a placeholder implementation.
                // Example: Query the blockchain for products by owner
                // Iterate through all products and filter by owner
                // Placeholder implementation - this would be replaced with actual data fetching
                const mockProducts = [
                    {
                        id: `prod-${Date.now()}-1`,
                        ownerId,
                        name: "Sample Product 1",
                        description: "This is a placeholder product",
                        quantity: 1,
                        price: 100,
                        metadata: {},
                        createdAt: Date.now() - 1000000,
                        updatedAt: Date.now() - 500000
                    },
                    {
                        id: `prod-${Date.now()}-2`,
                        ownerId,
                        name: "Sample Product 2",
                        description: "This is another placeholder product",
                        quantity: 5,
                        price: 200,
                        metadata: {},
                        createdAt: Date.now() - 2000000,
                        updatedAt: Date.now() - 1000000
                    }
                ];
                return mockProducts;
            }
            catch (error) {
                console.error("Error fetching products by owner:", error);
                return [];
            }
        });
    }
}
exports.default = ProductService;
