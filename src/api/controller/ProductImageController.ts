import { Request, Response } from "express";
import imagekit from '../../utils/imagekit';
import ProductImageService from '../../utils/productImageService';
import { UserRole } from '../../enum';

/**
 * Controller for handling product image operations
 */
export default class ProductImageController {
  /**
   * Check if user is the owner of the product and a farmer
   */
  static validateProductOwnership = async (req: Request, res: Response, next: Function) => {
    try {
      const productId = req.params.productId;
      const userId = req.user?.id;

      // Get product details to check ownership
      const productResponse = await fetch(`${req.protocol}://${req.get('host')}/api/product/${productId}`);
      const productData = await productResponse.json();
      
      if (!productResponse.ok) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }
      
      // Check if user is the product owner and a farmer
      if (productData.data.product.ownerId !== userId || req.user?.role !== UserRole.FARMER) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Only the farmer who owns this product can upload images."
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Error checking product ownership: ${(error as Error).message}`
      });
    }
  }

  /**
   * Handle successful image upload
   */
  static handleSuccessfulUpload = (req: Request, res: Response) => {
    const uploadedFiles = req.uploadedFiles || [];
    
    res.status(200).json({
      success: true,
      message: "Images uploaded successfully to ImageKit",
      data: {
        productId: req.params.productId,
        uploadedFiles: uploadedFiles.map((file: any) => ({
          fileId: file.fileId,
          name: file.name,
          url: file.url,
          thumbnailUrl: file.thumbnail || file.thumbnailUrl
        }))
      }
    });
  }

  /**
   * Get ImageKit authentication parameters
   */
  static getImageKitAuth = (req: Request, res: Response) => {
    try {
      const token = ProductImageService.getAuthParameters();
      res.status(200).json({
        success: true,
        data: token
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Error generating ImageKit authentication token: ${(error as Error).message}`
      });
    }
  }

  /**
   * Delete an image from ImageKit
   */
  static deleteImage = async (req: Request, res: Response) => {
    try {
      const fileId = req.params.fileId;
      const userId = req.user?.id;
      
      if (!fileId) {
        return res.status(400).json({
          success: false,
          message: "File ID is required"
        });
      }
      
      // Get file details to check ownership
      const fileDetails = await imagekit.getFileDetails(fileId);
      
      // Check if the file has a product tag
      const productTag = fileDetails.tags?.find((tag: string) => tag.startsWith('product-'));
      if (!productTag) {
        return res.status(403).json({
          success: false,
          message: "Access denied. This file is not associated with any product."
        });
      }
      
      // Extract product ID from tag
      const productId = productTag.replace('product-', '');
      
      // Get product details to check ownership
      const productResponse = await fetch(`${req.protocol}://${req.get('host')}/api/product/${productId}`);
      const productData = await productResponse.json();
      
      if (!productResponse.ok) {
        return res.status(404).json({
          success: false,
          message: "Associated product not found"
        });
      }
      
      // Check if user is the product owner and a farmer
      if (productData.data.product.ownerId !== userId || req.user?.role !== UserRole.FARMER) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Only the farmer who owns this product can delete its images."
        });
      }
      
      // Delete the file from ImageKit
      await ProductImageService.deleteImage(fileId);
      
      res.status(200).json({
        success: true,
        message: "Image deleted successfully",
        data: {
          fileId
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Error deleting image from ImageKit: ${(error as Error).message}`
      });
    }
  }

  /**
   * Get all images for a product
   */
  static getProductImages = async (req: Request, res: Response) => {
    try {
      const productId = req.params.productId;
      
      // Use the ProductImageService to get images
      const images = await ProductImageService.getProductImages(productId);
      
      if (!images || images.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No images found for this product"
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          productId,
          images
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Error retrieving images from ImageKit: ${(error as Error).message}`
      });
    }
  }
}