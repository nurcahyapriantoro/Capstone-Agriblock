import imagekit from './imagekit';
import { logger } from '../utils/logger';
import { FileObject } from 'imagekit/dist/libs/interfaces';

interface ProductImage {
  fileId: string;
  url: string;
  thumbnailUrl: string;
  name: string;
  size: number;
  createdAt: string;
}

class ProductImageService {
  /**
   * Get all images for a product
   */
  async getProductImages(productId: string): Promise<ProductImage[]> {
    try {
      const folderPath = `/product/${productId}`;
      
      // List files in the product folder
      const listResponse = await imagekit.listFiles({
        path: folderPath
      });
      
      // Filter to only get file objects (not folders)
      const files = listResponse.filter((item): item is FileObject => 
        'fileId' in item && item.type === 'file'
      );
      
      if (!files || files.length === 0) {
        return [];
      }
      
      return files.map(file => ({
        fileId: file.fileId,
        name: file.name,
        url: file.url,
        thumbnailUrl: file.thumbnail,
        size: file.size,
        createdAt: file.createdAt
      }));
    } catch (error) {
      logger.error(`Error retrieving images for product ${productId}:`, error);
      throw new Error(`Failed to retrieve product images: ${(error as Error).message}`);
    }
  }

  /**
   * Delete an image
   */
  async deleteImage(fileId: string): Promise<boolean> {
    try {
      await imagekit.deleteFile(fileId);
      return true;
    } catch (error) {
      logger.error(`Error deleting image ${fileId}:`, error);
      throw new Error(`Failed to delete image: ${(error as Error).message}`);
    }
  }

  /**
   * Get authentication token for client-side uploads
   */
  getAuthParameters() {
    return imagekit.getAuthenticationParameters();
  }

  /**
   * Link uploaded images to a product
   * (Use when uploading directly from client)
   */
  async linkImagesToProduct(productId: string, fileIds: string[]): Promise<boolean> {
    try {
      // Validate that all fileIds exist
      for (const fileId of fileIds) {
        const file = await imagekit.getFileDetails(fileId);
        if (!file) {
          throw new Error(`File ${fileId} not found`);
        }
        
        // Update file tags to include the product ID
        await imagekit.updateFileDetails(fileId, {
          tags: [`product-${productId}`]
        });
      }
      
      return true;
    } catch (error) {
      logger.error(`Error linking images to product ${productId}:`, error);
      throw new Error(`Failed to link images to product: ${(error as Error).message}`);
    }
  }

  /**
   * Get dispute evidence images
   */
  async getDisputeImages(disputeId: string): Promise<ProductImage[]> {
    try {
      const folderPath = `/disputes/${disputeId}`;
      
      // List files in the dispute folder
      const listResponse = await imagekit.listFiles({
        path: folderPath
      });
      
      // Filter to only get file objects (not folders)
      const files = listResponse.filter((item): item is FileObject => 
        'fileId' in item && item.type === 'file'
      );
      
      if (!files || files.length === 0) {
        return [];
      }
      
      return files.map(file => ({
        fileId: file.fileId,
        name: file.name,
        url: file.url,
        thumbnailUrl: file.thumbnail,
        size: file.size,
        createdAt: file.createdAt
      }));
    } catch (error) {
      logger.error(`Error retrieving images for dispute ${disputeId}:`, error);
      throw new Error(`Failed to retrieve dispute images: ${(error as Error).message}`);
    }
  }
}

export default new ProductImageService(); 