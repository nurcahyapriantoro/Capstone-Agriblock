import { Request, Response } from "express";
import ProductSynchronizationService from "../../core/ProductSynchronizationService";

/**
 * Controller untuk manajemen sinkronisasi produk antara database dan blockchain
 */
class SynchronizationController {
  /**
   * Menjalankan sinkronisasi produk dari database ke blockchain
   */
  static async synchronizeProducts(req: Request, res: Response) {
    try {
      console.log("Manual product synchronization triggered");
      
      // Jalankan sinkronisasi
      const result = await ProductSynchronizationService.synchronizeProducts();
      
      return res.status(200).json({
        success: true,
        data: {
          totalProducts: result.totalProducts,
          syncedProducts: result.syncedProducts,
          failedProducts: result.failedProducts,
          details: result.details
        },
        message: `Synchronization completed. ${result.syncedProducts} products synchronized.`
      });
    } catch (error) {
      console.error("Error in synchronizeProducts:", error);
      return res.status(500).json({
        success: false,
        message: `Error during synchronization: ${(error as Error).message}`
      });
    }
  }
}

export default SynchronizationController;