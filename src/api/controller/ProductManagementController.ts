import type { Request, Response } from "express";
import { ProductStatus, RecallReason, UserRole, TransactionActionType } from "../../enum";
import { ContractRegistry } from "../../contracts/ContractRegistry";
import { container, injectable } from 'tsyringe';
import ProductManagement, { PRODUCT_ID, USER_ID } from '../../core/ProductManagement';
import RoleService from '../../core/RoleService';
import ProductService from '../../core/ProductService';
import { txhashDB } from "../../helper/level.db.client";

// ID kontrak untuk pengelolaan produk
const contractId = 'product-management-v1';

@injectable()
export default class ProductManagementController {
  constructor() {
    // Tidak perlu lagi menyimpan instance roleService
  }

  /**
   * Menentukan status produk otomatis berdasarkan aksi dan peran pengguna
   * @param action Aksi yang dilakukan pada produk
   * @param currentStatus Status produk saat ini
   * @param userRole Peran pengguna yang melakukan aksi
   * @param targetRole Peran pengguna tujuan (opsional, untuk transfer)
   * @returns Status baru yang sesuai
   */
  private determineAutomaticStatus(
    action: TransactionActionType,
    currentStatus: ProductStatus,
    userRole: UserRole,
    targetRole?: UserRole
  ): ProductStatus {
    // Transisi status berdasarkan aksi dan peran
    switch (action) {
      case TransactionActionType.CREATE:
        return ProductStatus.CREATED;
      
      case TransactionActionType.TRANSFER:
        // Status berbeda tergantung peran pengirim dan penerima
        if (userRole === UserRole.FARMER && targetRole === UserRole.COLLECTOR) {
          return ProductStatus.TRANSFERRED;
        } else if (userRole === UserRole.COLLECTOR && targetRole === UserRole.TRADER) {
          return ProductStatus.TRANSFERRED;
        } else if (userRole === UserRole.TRADER && targetRole === UserRole.RETAILER) {
          return ProductStatus.TRANSFERRED;
        }
        return ProductStatus.TRANSFERRED;
      
      case TransactionActionType.RECEIVE:
        return ProductStatus.RECEIVED;
      
      case TransactionActionType.PACKAGE:
        return ProductStatus.PACKAGED;
      
      case TransactionActionType.SHIP:
        return ProductStatus.SHIPPED;
      
      case TransactionActionType.SELL:
        return ProductStatus.SOLD;
      
      case TransactionActionType.VERIFY:
        return ProductStatus.VERIFIED;
      
      case TransactionActionType.INSPECT:
        // Tergantung hasil inspeksi (dalam kasus ini kita asumsikan lulus)
        return ProductStatus.VERIFIED;
      
      case TransactionActionType.STOCK_IN:
        return ProductStatus.IN_STOCK;
      
      case TransactionActionType.STOCK_OUT:
        return ProductStatus.OUT_OF_STOCK;
      
      case TransactionActionType.RECALL:
        return ProductStatus.RECALLED;
      
      default:
        // Jika tidak ada pemetaan khusus, pertahankan status saat ini
        return currentStatus;
    }
  }

  /**
   * Proses transaksi produk dan mengupdate status secara otomatis
   * @param req Request HTTP
   * @param res Response HTTP
   * @param action Jenis aksi pada produk
   */
  processProductTransaction = async (req: Request, res: Response, action: TransactionActionType) => {
    try {
      console.log(`Processing ${action} transaction with body:`, JSON.stringify(req.body));
      const { productId, targetUserId, details } = req.body;
      const userId = req.user?.id;

      if (!productId || !userId) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameters: productId and user authentication"
        });
      }

      // Dapatkan produk saat ini
      const registry = ContractRegistry.getInstance();
      const productResult = await registry.queryContract(
        contractId,
        'getProduct',
        { productId }
      );

      if (!productResult.success || !productResult.product) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      const product = productResult.product;

      // Dapatkan peran pengguna saat ini - use RoleService directly
      let userRole: UserRole;
      try {
        const role = await RoleService.getUserRole(userId);
        if (!role) {
          return res.status(401).json({
            success: false,
            message: "User role not found"
          });
        }
        userRole = role;
      } catch (error) {
        console.error("Error getting user role:", error);
        return res.status(401).json({
          success: false,
          message: "Unable to determine user role"
        });
      }

      // Jika ada targetUserId, dapatkan perannya - use RoleService directly
      let targetRole: UserRole | undefined;
      if (targetUserId) {
        try {
          const role = await RoleService.getUserRole(targetUserId);
          if (role) {
            targetRole = role;
          }
        } catch (error) {
          console.warn(`Could not determine role for target user ${targetUserId}`, error);
        }
      }

      // Log roles for debugging
      console.log(`User roles - Current: ${userRole}, Target: ${targetRole}`);

      // Tentukan status baru berdasarkan aksi dan peran
      const newStatus = this.determineAutomaticStatus(
        action, 
        product.status,
        userRole,
        targetRole
      );

      // Validasi peran pengguna dengan status yang akan diupdate
      const isAllowed = this.isStatusUpdateAllowed(userRole, newStatus);
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          message: `User with role ${userRole} is not authorized to set product status to ${newStatus}`
        });
      }

      // Lakukan aksi transaksi sesuai dengan jenis aksi
      // Dalam implementasi sebenarnya, ini akan memanggil kontrak dan logika bisnis yang sesuai
      
      // Sebagai contoh, untuk proses transfer:
      if (action === TransactionActionType.TRANSFER && targetUserId) {
        // Lakukan logika transfer produk ke pengguna lain
        // ...
      }

      // Lalu update status produk secara otomatis
      const result = await registry.executeContract(
        contractId,
        'updateProductStatus',
        { productId, newStatus, details },
        userId
      );

      if (result.success) {
        // Update local database status to match blockchain status
        const localProduct = await ProductService.getProduct(productId);
        if (localProduct) {
          localProduct.status = newStatus;
          localProduct.updatedAt = Date.now();
          await txhashDB.put(`product:${productId}`, JSON.stringify(localProduct));
        }
        
        return res.status(200).json({
          success: true,
          message: `Product ${action} successful and status updated to ${newStatus}`,
          data: {
            ...result,
            newStatus
          }
        });
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error(`Error in processProductTransaction (${action}):`, error);
      return res.status(500).json({
        success: false,
        message: `Error processing product transaction: ${(error as Error).message}`
      });
    }
  }

  /**
   * Check if user role is allowed to update product to the specified status
   * @param userRole User role
   * @param newStatus New product status
   * @returns Whether the update is allowed
   */
  private isStatusUpdateAllowed(userRole: UserRole, newStatus: ProductStatus): boolean {
    // Mapping peran pengguna dengan status produk yang diizinkan
    const allowedStatusUpdates: Record<UserRole, ProductStatus[]> = {
      [UserRole.FARMER]: [
        ProductStatus.CREATED,
        ProductStatus.TRANSFERRED
      ],
      [UserRole.COLLECTOR]: [
        ProductStatus.RECEIVED,
        ProductStatus.PACKAGED,
        ProductStatus.TRANSFERRED,
        ProductStatus.SHIPPED,
        ProductStatus.IN_STOCK,
        ProductStatus.OUT_OF_STOCK,
        ProductStatus.LOW_STOCK
      ],
      [UserRole.TRADER]: [
        ProductStatus.RECEIVED,
        ProductStatus.PACKAGED,
        ProductStatus.TRANSFERRED,
        ProductStatus.SHIPPED,
        ProductStatus.IN_STOCK,
        ProductStatus.OUT_OF_STOCK,
        ProductStatus.LOW_STOCK,
        ProductStatus.SOLD
      ],
      [UserRole.RETAILER]: [
        ProductStatus.RECEIVED,
        ProductStatus.SOLD,
        ProductStatus.IN_STOCK,
        ProductStatus.OUT_OF_STOCK,
        ProductStatus.LOW_STOCK
      ],
      [UserRole.CONSUMER]: [
        // Konsumen biasanya tidak memperbarui status produk
      ]
    };

    // Jika peran pengguna tidak ditemukan dalam pemetaan, kembalikan false
    if (!allowedStatusUpdates[userRole]) {
      return false;
    }

    // Periksa apakah status produk baru diizinkan untuk peran pengguna ini
    return allowedStatusUpdates[userRole].includes(newStatus);
  }

  /**
   * Transfer product from one user to another
   * This function will automatically update product status based on roles
   */
  transferProduct = async (req: Request, res: Response) => {
    return this.processProductTransaction(req, res, TransactionActionType.TRANSFER);
  }

  /**
   * Process product receipt
   * This function will automatically update status to RECEIVED
   */
  receiveProduct = async (req: Request, res: Response) => {
    return this.processProductTransaction(req, res, TransactionActionType.RECEIVE);
  }

  /**
   * Package product for shipping
   * This function will automatically update status to PACKAGED
   */
  packageProduct = async (req: Request, res: Response) => {
    return this.processProductTransaction(req, res, TransactionActionType.PACKAGE);
  }

  /**
   * Ship product to destination
   * This function will automatically update status to SHIPPED
   */
  shipProduct = async (req: Request, res: Response) => {
    return this.processProductTransaction(req, res, TransactionActionType.SHIP);
  }

  /**
   * Sell product to customer
   * This function will automatically update status to SOLD
   * Only retailers can sell products to consumers
   */
  sellProduct = async (req: Request, res: Response) => {
    try {
      console.log("Starting sellProduct with request body:", JSON.stringify(req.body));
      
      // Extract productId from request (handle both body and params)
      const productIdFromBody = req.body.productId;
      const productIdFromParams = req.params.productId;
      const productId = productIdFromBody || productIdFromParams;
      
      // Extract targetUserId (the consumer who is buying the product)
      const { targetUserId, details } = req.body;
      
      // Check if product ID was provided
      if (!productId) {
        console.error("Missing productId in request");
        return res.status(400).json({
          success: false,
          message: "Missing required parameter: productId"
        });
      }
      
      // Check if targetUserId was provided
      if (!targetUserId) {
        console.error("Missing targetUserId in request");
        return res.status(400).json({
          success: false,
          message: "Missing required parameter: targetUserId (the consumer who is buying the product)"
        });
      }
      
      console.log("Processing sell request for product ID:", productId);
      
      // Get user ID (from JWT token) - the seller
      const userId = req.user?.id;
      if (!userId) {
        console.error("User ID not found in request. Authentication failed.");
        return res.status(401).json({
          success: false,
          message: "User authentication required for selling a product"
        });
      }
      
      console.log("User ID for sell operation:", userId);
      console.log("User role:", await RoleService.getUserRole(userId));
      console.log("Target user role:", await RoleService.getUserRole(targetUserId));
      
      // Verify the seller has the RETAILER role
      let userRole: UserRole;
      try {
        const role = await RoleService.getUserRole(userId);
        if (!role) {
          console.error("Role not found for user ID:", userId);
          return res.status(401).json({
            success: false,
            message: "User role not found"
          });
        }
        userRole = role;
        console.log("User role:", userRole);
        
        // Verify user is a retailer
        if (userRole !== UserRole.RETAILER) {
          console.error("User does not have retailer role. Has role:", userRole);
          return res.status(403).json({
            success: false, 
            message: "Only retailers can sell products to consumers"
          });
        }
      } catch (error) {
        console.error("Error determining user role:", error);
        return res.status(500).json({
          success: false,
          message: "Unable to determine user role"
        });
      }
      
      // Verify the buyer has the CONSUMER role
      try {
        const targetRole = await RoleService.getUserRole(targetUserId);
        if (!targetRole) {
          console.error("Role not found for target user ID:", targetUserId);
          return res.status(400).json({
            success: false,
            message: "Target user role not found"
          });
        }
        
        console.log("Target user role:", targetRole);
        
        // Verify target user is a consumer
        if (targetRole !== UserRole.CONSUMER) {
          console.error("Target user does not have consumer role. Has role:", targetRole);
          return res.status(403).json({
            success: false, 
            message: "Products can only be sold to users with CONSUMER role"
          });
        }
      } catch (error) {
        console.error("Error determining target user role:", error);
        return res.status(500).json({
          success: false,
          message: "Unable to determine target user role"
        });
      }
      
      // Try to get product directly from ProductService first to verify format
      const directProductCheck = await ProductService.getProduct(productId);
      console.log("Direct product check result:", directProductCheck ? "Found" : "Not found");
      
      // Check that product exists before trying to sell it
      const registry = ContractRegistry.getInstance();
      let productCheckResult = await registry.queryContract(
        contractId,
        'getProduct',
        { productId }
      );
      
      console.log("Product check result:", JSON.stringify(productCheckResult));
      
      // If product exists in database but not in blockchain, register it in blockchain
      if (directProductCheck && (!productCheckResult.success || !productCheckResult.product)) {
        console.log("Product found in database but not in blockchain. Attempting to register in blockchain...");
        
        // Register the product in blockchain using executeContract
        const registerResult = await registry.executeContract(
          contractId,
          'createProduct',
          { 
            farmerId: directProductCheck.ownerId,
            name: directProductCheck.name,
            productName: directProductCheck.name, // Using name as productName if not available
            description: directProductCheck.description || '',
            initialQuantity: directProductCheck.quantity || 0,
            unit: directProductCheck.metadata?.unit || 'unit',
            price: directProductCheck.price || 0,
            productionDate: directProductCheck.metadata?.productionDate || new Date().toISOString(),
            expiryDate: directProductCheck.metadata?.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            location: directProductCheck.metadata?.location || 'Unknown',
            metadata: directProductCheck.metadata || {}
          },
          directProductCheck.ownerId
        );
        
        console.log("Registration result:", JSON.stringify(registerResult));
        
        // Check registration result and fetch product again
        if (registerResult.success) {
          productCheckResult = await registry.queryContract(
            contractId,
            'getProduct',
            { productId }
          );
          console.log("Product check after registration:", JSON.stringify(productCheckResult));
        }
      }
      
      if (!productCheckResult.success || !productCheckResult.product) {
        console.error("Product not found:", productId);
        
        // Provide a more detailed error to help debug
        return res.status(404).json({
          success: false,
          message: `Product with ID ${productId} not found. Please verify the product ID.`,
          details: {
            productIdProvided: productId,
            source: productIdFromBody ? "request body" : "request params"
          }
        });
      }
      
      const product = productCheckResult.product;
      console.log("Found product:", product.name, "with current status:", product.status);
      
      // Check that the product belongs to the seller
      if (product.ownerId !== userId) {
        console.error("Product not owned by seller. Owner:", product.ownerId, "Seller:", userId);
        return res.status(403).json({
          success: false,
          message: "You can only sell products that you own"
        });
      }
      
      // Verify the product is not reconstructed or has integrity issues
      if (product.metadata && (
          product._integrityFixed || 
          product.metadata._integrityFixed || 
          product.name === "Rekonstruksi Produk" || 
          product.productName === "Produk Direkonstruksi" ||
          (product.description && product.description.includes("direkonstruksi"))
        )) {
        console.error("Attempted to sell a reconstructed product:", productId);
        return res.status(403).json({
          success: false,
          message: "Cannot sell reconstructed products. Only original products can be sold to consumers."
        });
      }
      
      // All checks passed, continue with the sale
      // Add the targetUserId to the request body if not already there
      req.body.targetUserId = targetUserId;
      
      // Continue with normal flow by delegating to processProductTransaction
      return this.processProductTransaction(req, res, TransactionActionType.SELL);
    } catch (error) {
      console.error("Error in sellProduct:", error);
      return res.status(500).json({
        success: false,
        message: `Error selling product: ${(error as Error).message}`
      });
    }
  }

  /**
   * Recall a product
   */
  recallProduct = async (req: Request, res: Response) => {
    try {
      const { productId, reason, details } = req.body;
      const userId = req.user?.id;

      if (!productId || !reason) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameters: productId and reason are required"
        });
      }

      // Check if userId exists
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required"
        });
      }

      // Validate that the reason is a valid RecallReason
      if (!Object.values(RecallReason).includes(reason as RecallReason)) {
        return res.status(400).json({
          success: false,
          message: "Invalid recall reason specified"
        });
      }

      // Register runtime values for ProductManagement
      container.register(PRODUCT_ID, { useValue: productId });
      container.register(USER_ID, { useValue: userId });
      const productManagement = container.resolve(ProductManagement);

      // Panggil smart contract melalui ContractRegistry
      const registry = ContractRegistry.getInstance();
      const result = await registry.executeContract(
        contractId,
        'recallProduct',
        { productId, reason, details },
        userId
      );

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in recallProduct:", error);
      return res.status(500).json({
        success: false,
        message: `Error recalling product: ${(error as Error).message}`
      });
    }
  };

  /**
   * Verify product quality
   */
  verifyProduct = async (req: Request, res: Response) => {
    try {
      const { productId, qualityChecks, requiredAttributes, minimumStandards, details } = req.body;
      const userId = req.user?.id;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameter: productId is required"
        });
      }

      // Check if userId exists
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User authentication required"
        });
      }

      // Membuat kriteria verifikasi
      const criteria: any = {
        qualityChecks: qualityChecks || [],
        requiredAttributes: requiredAttributes || [],
        minimumStandards: minimumStandards || {}
      };

      // Jika kualitas skor diberikan, tambahkan ke minimumStandards
      if (req.body.qualityScore !== undefined) {
        criteria.minimumStandards.qualityScore = req.body.qualityScore;
      }

      // Panggil smart contract melalui ContractRegistry
      const registry = ContractRegistry.getInstance();
      const result = await registry.executeContract(
        contractId,
        'verifyProduct',
        { 
          productId, 
          criteria,
          details
        },
        userId
      );

      // Ambil status konsensus untuk ditampilkan kepada user
      let consensusStatus = null;
      if (result.success && result.consensusResult) {
        const consensusResult = result.consensusResult;
        
        // Dapatkan juga verifikasi yang ada untuk produk ini
        const verificationsResult = await registry.queryContract(
          contractId,
          'getProductVerifications',
          { productId }
        );
        
        consensusStatus = {
          achieved: consensusResult.achieved,
          requiredRoles: consensusResult.requiredRoles,
          verifiedRoles: consensusResult.verifiedRoles,
          missingRoles: consensusResult.missingRoles,
          totalVerifications: consensusResult.totalVerifications,
          positiveVerifications: consensusResult.positiveVerifications,
          negativeVerifications: consensusResult.negativeVerifications,
          verifications: verificationsResult.product?.verifications || []
        };
      }

      if (result.success) {
        return res.status(200).json({
          ...result,
          consensusStatus
        });
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in verifyProduct:", error);
      return res.status(500).json({
        success: false,
        message: `Error verifying product: ${(error as Error).message}`
      });
    }
  };

  /**
   * Get product verification status including consensus information
   */
  getProductVerifications = async (req: Request, res: Response) => {
    try {
      const productId = req.params.productId || req.query.productId as string;
      const userId = req.user?.id || 'system';

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameter: productId"
        });
      }

      // Panggil smart contract melalui ContractRegistry
      const registry = ContractRegistry.getInstance();
      
      // Get verifications
      const verificationsResult = await registry.queryContract(
        contractId,
        'getProductVerifications',
        { productId }
      );
      
      // Get consensus status
      const consensusResult = await registry.queryContract(
        contractId,
        'getVerificationConsensus',
        { productId }
      );
      
      return res.status(200).json({
        success: true,
        productId,
        verifications: verificationsResult.product?.verifications || [],
        consensus: consensusResult.consensusResult || {
          achieved: false,
          verifiedRoles: [],
          totalVerifications: 0,
          positiveVerifications: 0,
          negativeVerifications: 0,
          consensusRatio: 0,
          requiredRoles: [],
          missingRoles: []
        },
        product: verificationsResult.product
      });
    } catch (error) {
      console.error("Error in getProductVerifications:", error);
      return res.status(500).json({
        success: false,
        message: `Error getting product verifications: ${(error as Error).message}`
      });
    }
  };

  /**
   * Check verification consensus for a product
   */
  checkVerificationConsensus = async (req: Request, res: Response) => {
    try {
      const productId = req.params.productId || req.body.productId;
      const userId = req.user?.id || 'system';

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameter: productId"
        });
      }

      // Panggil smart contract melalui ContractRegistry
      const registry = ContractRegistry.getInstance();
      const result = await registry.executeContract(
        contractId,
        'checkVerificationConsensus',
        { productId },
        userId
      );

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in checkVerificationConsensus:", error);
      return res.status(500).json({
        success: false,
        message: `Error checking verification consensus: ${(error as Error).message}`
      });
    }
  };

  /**
   * Get all recalled products
   */
  getRecalledProducts = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id || 'system';

      // Register runtime values for ProductManagement
      container.register(USER_ID, { useValue: userId });
      const productManagement = container.resolve(ProductManagement);

      // Panggil smart contract melalui ContractRegistry
      const registry = ContractRegistry.getInstance();
      const result = await registry.queryContract(
        contractId,
        'getRecalledProducts',
        {}
      );

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in getRecalledProducts:", error);
      return res.status(500).json({
        success: false,
        message: `Error getting recalled products: ${(error as Error).message}`
      });
    }
  };

  /**
   * Get the latest status of a product
   */
  getProductStatus = async (req: Request, res: Response) => {
    try {
      // Try to get productId from different possible sources
      const productId = req.params.productId || req.params.id || req.query.productId as string;
      const userId = req.user?.id || 'system';

      console.log("Request params:", req.params);
      console.log("Request query:", req.query);
      console.log("Looking for product status with ID:", productId);

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameter: productId"
        });
      }

      // Register runtime values for ProductManagement
      container.register(PRODUCT_ID, { useValue: productId });
      container.register(USER_ID, { useValue: userId });
      const productManagement = container.resolve(ProductManagement);

      // Panggil smart contract melalui ContractRegistry untuk mendapatkan produk
      const registry = ContractRegistry.getInstance();
      const result = await registry.queryContract(
        contractId,
        'getProduct',
        { productId }
      );

      console.log("Product query result:", JSON.stringify(result));

      if (result.success && result.product) {
        return res.status(200).json({
          success: true,
          data: {
            productId,
            status: result.product.status,
            lastUpdated: new Date(result.product.updatedAt),
            details: result.product.metadata
          }
        });
      } else {
        return res.status(404).json({
          success: false,
          message: "Product status not found"
        });
      }
    } catch (error) {
      console.error("Error in getProductStatus:", error);
      return res.status(500).json({
        success: false,
        message: `Error getting product status: ${(error as Error).message}`
      });
    }
  };
}