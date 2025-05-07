import { ProductStatus } from "../enum";
import { txhashDB } from "../helper/level.db.client";
import ProductService from "./ProductService";
import { ContractRegistry } from "../contracts/ContractRegistry";

// ID kontrak untuk pengelolaan produk
const contractId = 'product-management-v1';

interface SyncResult {
  success: boolean;
  totalProducts: number;
  syncedProducts: number;
  failedProducts: number;
  details?: Array<{
    productId: string;
    status: 'success' | 'failed';
    message?: string;
  }>;
}

/**
 * Service untuk menyinkronkan produk antara database dan blockchain
 */
class ProductSynchronizationService {
  private static registry = ContractRegistry.getInstance();

  /**
   * Menyinkronkan produk dari database ke blockchain
   * @returns Hasil sinkronisasi
   */
  static async synchronizeProducts(): Promise<SyncResult> {
    console.log("Starting product synchronization process...");
    
    // 1. Ambil semua produk dari database konvensional
    const databaseProducts = await ProductService.getAllProducts();
    console.log(`Found ${databaseProducts.length} products in database`);
    
    const result: SyncResult = {
      success: true,
      totalProducts: databaseProducts.length,
      syncedProducts: 0,
      failedProducts: 0,
      details: []
    };
    
    // 2. Periksa dan sinkronkan setiap produk
    for (const product of databaseProducts) {
      try {
        // Pastikan produk memiliki ID yang valid
        if (!product.id) {
          console.error("Skipping product without valid ID");
          result.failedProducts++;
          result.details?.push({
            productId: "unknown",
            status: 'failed',
            message: "Product ID is missing or invalid"
          });
          continue;
        }

        // Periksa apakah produk sudah ada di blockchain
        const blockchainCheck = await this.registry.queryContract(
          contractId,
          'getProduct',
          { productId: product.id }
        );
        
        // Jika produk belum ada di blockchain, daftarkan
        if (!blockchainCheck.success || !blockchainCheck.product) {
          console.log(`Product ${product.id} not found in blockchain, registering...`);
          
          // Validasi data produk sebelum mencoba mendaftarkan ke blockchain
          const name = product.name || "";
          const productName = product.metadata?.productName || product.name || "";
          const initialQuantity = product.quantity && product.quantity > 0 ? product.quantity : 1;
          
          // Validasi dasar
          if (name.trim().length < 3 || productName.trim().length < 2) {
            console.error(`Product ${product.id} has invalid data: name or productName too short`);
            result.failedProducts++;
            result.details?.push({
              productId: product.id,
              status: 'failed',
              message: `Invalid data: name: "${name}", productName: "${productName}"`
            });
            continue;
          }
          
          // Pastikan kita memiliki ownerId/farmerId
          if (!product.ownerId) {
            console.error(`Product ${product.id} has no owner ID, skipping`);
            result.failedProducts++;
            result.details?.push({
              productId: product.id,
              status: 'failed',
              message: "Owner ID is missing"
            });
            continue;
          }
          
          const registerResult = await this.registry.executeContract(
            contractId,
            'createProduct',
            { 
              farmerId: product.ownerId,
              name: name,
              productName: productName,
              description: product.description || 'No description available',
              initialQuantity: initialQuantity,
              unit: product.metadata?.unit || 'unit',
              price: product.price || 0,
              productionDate: product.metadata?.productionDate || new Date().toISOString(),
              expiryDate: product.metadata?.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              location: product.metadata?.location || 'Unknown',
              metadata: product.metadata || {}
            },
            product.ownerId
          );
          
          if (registerResult.success) {
            result.syncedProducts++;
            result.details?.push({
              productId: product.id,
              status: 'success',
              message: `Successfully registered in blockchain with transaction ID: ${registerResult.transactionId}`
            });
            console.log(`Product ${product.id} successfully registered in blockchain`);
          } else {
            result.failedProducts++;
            result.details?.push({
              productId: product.id,
              status: 'failed',
              message: registerResult.message || 'Failed to register in blockchain'
            });
            console.error(`Failed to register product ${product.id} in blockchain:`, registerResult.message);
          }
        } else {
          // Produk sudah ada di blockchain, tidak perlu sinkronisasi
          console.log(`Product ${product.id} already exists in blockchain`);
        }
      } catch (error) {
        result.failedProducts++;
        result.details?.push({
          productId: product.id || "unknown",
          status: 'failed',
          message: `Error during synchronization: ${(error as Error).message}`
        });
        console.error(`Error synchronizing product ${product.id || "unknown"}:`, error);
      }
    }
    
    console.log(`Synchronization completed. Total: ${result.totalProducts}, Synced: ${result.syncedProducts}, Failed: ${result.failedProducts}`);
    return result;
  }

  /**
   * Menjadwalkan sinkronisasi berkala
   * @param intervalMinutes Interval dalam menit
   */
  static schedulePeriodicSync(intervalMinutes: number = 60): NodeJS.Timeout {
    console.log(`Scheduling periodic product synchronization every ${intervalMinutes} minutes`);
    
    return setInterval(async () => {
      console.log("Running scheduled product synchronization...");
      try {
        await this.synchronizeProducts();
      } catch (error) {
        console.error("Error during scheduled product synchronization:", error);
      }
    }, intervalMinutes * 60 * 1000);
  }
}

export default ProductSynchronizationService;