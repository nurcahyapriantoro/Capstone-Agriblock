import { UserRole } from "../enum";
import OwnershipTransfer from "./OwnershipTransfer";
import RoleService from "./RoleService";
import { TransactionHistoryService } from "./TransactionHistory";
import { txhashDB } from "../helper/level.db.client";
import { ProductStatus } from "../enum";
import { ContractRegistry } from "../contracts/ContractRegistry";

// ID kontrak untuk pengelolaan produk
const contractId = 'product-management-v1';

interface ProductData {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  quantity?: number;
  price?: number;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  status: ProductStatus;
}

interface ProductTransferParams {
  productId: string;
  currentOwnerId: string;
  newOwnerId: string;
  role: UserRole;
  details?: Record<string, any>;
}

/**
 * Service for managing products and their ownership
 */
class ProductService {
  /**
   * Get product by ID
   * @param productId ID of the product to retrieve
   * @returns Product data or null if not found
   */
  static async getProduct(productId: string): Promise<ProductData | null> {
    try {
      // Retrieve data from the database
      try {
        const data = await txhashDB.get(`product:${productId}`);
        
        // Check if data is already an object or needs parsing
        let productData;
        if (typeof data === 'string') {
          try {
            productData = JSON.parse(data);
          } catch (parseError) {
            console.error(`Error parsing product data for ID ${productId}:`, parseError);
            return null;
          }
        } else {
          // Data is already an object
          productData = data;
        }
        
        return productData;
      } catch (err) {
        console.error("Error retrieving product from database:", err);
        // Fallback if data not found
        return null;
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      return null;
    }
  }

  /**
   * Validate and execute a product ownership transfer
   * @param params Parameters for the ownership transfer
   * @returns Result of the transfer operation
   */
  static async transferOwnership(
    params: ProductTransferParams
  ): Promise<{ success: boolean; message?: string; transactionId?: string }> {
    const { productId, currentOwnerId, newOwnerId, role, details } = params;

    // Get product data
    const productData = await this.getProduct(productId);
    
    if (!productData) {
      return {
        success: false,
        message: `Product with ID ${productId} not found.`
      };
    }
    
    // Tambahan: Verifikasi status produk sebelum transfer
    if (productData.status === ProductStatus.RECALLED) {
      return {
        success: false,
        message: "Product has been recalled and cannot be transferred."
      };
    }

    // Create an ownership transfer instance
    const ownershipTransfer = new OwnershipTransfer(
      productId,
      currentOwnerId,
      newOwnerId,
      role
    );
    
    // Set the product data for validation
    ownershipTransfer.setProductData(productData);
    
    // Execute the transfer
    const transferResult = await ownershipTransfer.executeTransfer();
    
    // If transfer is successful, record it in the transaction history
    if (transferResult.success) {
      // Get the roles of both parties
      const fromRole = await RoleService.getUserRole(currentOwnerId);
      const toRole = await RoleService.getUserRole(newOwnerId);
      
      if (fromRole && toRole) {
        // Record the transfer in transaction history
        const historyResult = await TransactionHistoryService.recordProductTransfer(
          productId,
          currentOwnerId,
          fromRole,
          newOwnerId,
          toRole,
          details
        );
        
        if (historyResult.success) {
          // Update product ownership in database
          productData.ownerId = newOwnerId;
          productData.updatedAt = Date.now();
          
          // Update product status to TRANSFERRED
          productData.status = ProductStatus.TRANSFERRED;
          
          // Save updated product data
          await txhashDB.put(`product:${productId}`, JSON.stringify(productData));
          
          return {
            success: true,
            message: transferResult.message,
            transactionId: historyResult.transactionId
          };
        }
      }
    }
    
    return transferResult;
  }
  
  /**
   * Create a new product with the farmer as the initial owner and register it in blockchain
   * @param farmerId ID of the farmer creating the product
   * @param productData Data produk (name, description, quantity, price, metadata, status)
   * @param details Informasi tambahan yang akan direkam dalam transaksi
   * @returns Result of the product creation
   */
  static async createProduct(
    farmerId: string, 
    productData: Omit<ProductData, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>,
    details?: Record<string, any>
  ): Promise<{ success: boolean; productId?: string; message?: string; transactionId?: string; blockchainRegistered?: boolean; blockchainTransactionId?: string }> {
    try {
      // Verify that the creator is a farmer
      const farmerRole = await RoleService.getUserRole(farmerId);
      
      if (farmerRole !== UserRole.FARMER) {
        return {
          success: false,
          message: "Only farmers can create new products."
        };
      }
      
      // Generate a unique product ID
      const productId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create the product
      const newProduct: ProductData = {
        id: productId,
        ownerId: farmerId,
        ...productData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: ProductStatus.CREATED  // Mengubah dari ACTIVE menjadi CREATED
      };
      
      // Pastikan quantity tidak undefined
      if (newProduct.quantity === undefined) {
        if (details && details.initialQuantity) {
          newProduct.quantity = details.initialQuantity;
        } else {
          newProduct.quantity = 0; // Default fallback
        }
      }
      
      // Simpan produk di database lokal
      await txhashDB.put(`product:${productId}`, JSON.stringify(newProduct));
      
      // Record the product creation in transaction history
      const productDetails = {
        name: productData.name,
        description: productData.description,
        quantity: newProduct.quantity, // Gunakan nilai quantity yang sudah dipastikan
        price: productData.price,
        ...details
      };
      
      const historyResult = await TransactionHistoryService.recordProductCreation(
        productId,
        farmerId,
        productDetails
      );
      
      // Langsung daftarkan ke blockchain
      let blockchainResult;
      let blockchainRegistered = false;
      
      try {
        const registry = ContractRegistry.getInstance();
        
        // Validasi data sebelum mengirim ke blockchain
        const validName = newProduct.name && newProduct.name.trim().length >= 3 
          ? newProduct.name 
          : `Product ${productId.substring(0, 8)}`;
          
        const validProductName = details?.productName && details.productName.toString().trim().length >= 2 
          ? details.productName 
          : validName;
          
        const validQuantity = newProduct.quantity && newProduct.quantity > 0 
          ? newProduct.quantity 
          : 1;
        
        // Daftarkan produk ke blockchain
        blockchainResult = await registry.executeContract(
          contractId,
          'createProduct',
          { 
            farmerId,
            name: validName,
            productName: validProductName,
            description: newProduct.description || "No description available",
            initialQuantity: validQuantity,
            unit: newProduct.metadata?.unit || details?.unit || "unit",
            price: newProduct.price || 0,
            productionDate: newProduct.metadata?.productionDate || details?.productionDate || new Date().toISOString(),
            expiryDate: newProduct.metadata?.expiryDate || details?.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            location: newProduct.metadata?.location || details?.location || "Unknown",
            metadata: newProduct.metadata || {}
          },
          farmerId
        );
        
        blockchainRegistered = blockchainResult.success;
        
        console.log(`Product ${productId} ${blockchainRegistered ? 'successfully' : 'failed to be'} registered in blockchain`);
        
        // Update produk di database dengan informasi blockchain registration
        if (blockchainRegistered) {
          newProduct.metadata = {
            ...newProduct.metadata,
            blockchainRegistered: true,
            blockchainTransactionId: blockchainResult.transactionId,
            blockchainRegisteredAt: Date.now()
          };
          
          await txhashDB.put(`product:${productId}`, JSON.stringify(newProduct));
        }
      } catch (blockchainError) {
        console.error(`Failed to register product ${productId} in blockchain:`, blockchainError);
        blockchainRegistered = false;
      }
      
      return {
        success: true,
        productId,
        message: blockchainRegistered 
          ? "Product created successfully and registered in blockchain" 
          : "Product created successfully but failed to register in blockchain. It will be synchronized later.",
        transactionId: historyResult.transactionId,
        blockchainRegistered,
        blockchainTransactionId: blockchainResult?.transactionId
      };
    } catch (error) {
      console.error("Error creating product:", error);
      return {
        success: false,
        message: "Failed to create product due to an error."
      };
    }
  }
  
  /**
   * Get all products owned by a specific user
   * @param ownerId ID of the product owner
   * @returns Array of products owned by the user
   */
  static async getProductsByOwner(ownerId: string): Promise<ProductData[]> {
    try {
      // Implementasi yang lebih baik untuk mendapatkan produk berdasarkan pemilik
      const products: ProductData[] = [];
      
      // Buat fungsi untuk mendapatkan semua kunci produk
      // Ini hanya simulasi, implementasi sebenarnya tergantung pada database Anda
      const allKeys = await txhashDB.keys().all();
      const productKeys = allKeys.filter(key => key.toString().startsWith('product:'));
      
      // Iterasi semua produk
      for (const key of productKeys) {
        try {
          const data = await txhashDB.get(key);
          
          // Check if data is already an object or needs parsing
          let productData;
          if (typeof data === 'string') {
            try {
              productData = JSON.parse(data);
            } catch (parseError) {
              console.error(`Error parsing product data for key ${key}:`, parseError);
              continue; // Skip this product and move to the next
            }
          } else {
            // Data is already an object
            productData = data;
          }
          
          // Now check if it matches the owner
          if (productData && productData.ownerId === ownerId) {
            products.push(productData);
          }
        } catch (productError) {
          console.error(`Error retrieving product for key ${key}:`, productError);
          // Continue to the next product
        }
      }
      
      return products;
    } catch (error) {
      console.error("Error fetching products by owner:", error);
      return [];
    }
  }

  /**
   * Get all products 
   * @returns Array of all products
   */
  static async getAllProducts(): Promise<ProductData[]> {
    try {
      // Get all product keys
      const allKeys = await txhashDB.keys().all();
      const productKeys = allKeys.filter(key => key.toString().startsWith('product:'));
      
      // Get all products with proper type checking
      const products: ProductData[] = [];
      
      for (const key of productKeys) {
        try {
          const data = await txhashDB.get(key);
          
          // Check if data is already an object or needs parsing
          let productData;
          if (typeof data === 'string') {
            try {
              productData = JSON.parse(data);
            } catch (parseError) {
              console.error(`Error parsing product data for key ${key}:`, parseError);
              continue; // Skip this product
            }
          } else {
            // Data is already an object
            productData = data;
          }
          
          if (productData) {
            products.push(productData);
          }
        } catch (productError) {
          console.error(`Error retrieving product for key ${key}:`, productError);
          // Continue to the next product
        }
      }
      
      return products;
    } catch (error) {
      console.error("Error fetching all products:", error);
      return [];
    }
  }
}

export default ProductService;