import express, { Request, Response } from "express";
import { authenticateJWT } from "../../middleware/auth";
import ProductService from "../../core/ProductService";
import { ErrorCode, sendErrorResponse } from "../../utils/errorHandler";
import { extractPaginationParams } from "../../utils/paginationUtils";

const router = express.Router();

/**
 * @swagger
 * /product/{productId}/versions:
 *   get:
 *     summary: Get version history for a product
 *     tags: [Products, Versioning]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the product
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of versions per page
 *     responses:
 *       200:
 *         description: Version history
 *       403:
 *         description: Unauthorized - only product owner can view version history
 *       404:
 *         description: Product not found
 */
router.get("/:productId/versions", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const userId = req.user?.id;
    const params = extractPaginationParams(req.query);
    // Using default values to prevent 'possibly undefined' errors
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;

    // Get product to check if it exists and validate ownership
    const product = await ProductService.getProduct(productId);
    
    if (!product) {
      return sendErrorResponse(
        res,
        ErrorCode.PRODUCT_NOT_FOUND,
        `Product with ID ${productId} not found`
      );
    }
    
    // Check if the user is the product owner
    // (In a real application, you might also allow admins or other roles)
    if (product.ownerId !== userId) {
      return sendErrorResponse(
        res,
        ErrorCode.FORBIDDEN,
        "Only the product owner can view version history"
      );
    }
    
    // Import ProductVersioningService
    const ProductVersioningService = (await import("../../services/ProductVersioningService")).default;
    
    // Get version history with pagination
    const offset = (page - 1) * limit;
    const versions = await ProductVersioningService.getVersionHistory(productId, limit, offset);
    
    // Get the total count of versions
    const currentVersion = await ProductVersioningService.getCurrentVersionNumber(productId);
    
    return res.status(200).json({
      success: true,
      data: {
        versions,
        pagination: {
          total: currentVersion,
          page,
          limit,
          totalPages: Math.ceil(currentVersion / limit),
          hasNext: page < Math.ceil(currentVersion / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error("Error getting product version history:", error);
    return sendErrorResponse(
      res,
      ErrorCode.GENERAL_ERROR,
      "Error retrieving product version history",
      error instanceof Error ? error.message : undefined
    );
  }
});

/**
 * @swagger
 * /product/{productId}/version/{versionNumber}:
 *   get:
 *     summary: Get a specific version of a product
 *     tags: [Products, Versioning]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the product
 *       - in: path
 *         name: versionNumber
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: true
 *         description: Version number
 *     responses:
 *       200:
 *         description: Product version
 *       403:
 *         description: Unauthorized - only product owner can view version
 *       404:
 *         description: Product or version not found
 */
router.get("/:productId/version/:versionNumber", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { productId, versionNumber } = req.params;
    const userId = req.user?.id;
    const versionNum = parseInt(versionNumber);

    if (isNaN(versionNum) || versionNum < 1) {
      return sendErrorResponse(
        res,
        ErrorCode.VALIDATION_ERROR,
        "Version number must be a positive integer"
      );
    }

    // Get product to check if it exists and validate ownership
    const product = await ProductService.getProduct(productId);
    
    if (!product) {
      return sendErrorResponse(
        res,
        ErrorCode.PRODUCT_NOT_FOUND,
        `Product with ID ${productId} not found`
      );
    }
    
    // Check if the user is the product owner
    if (product.ownerId !== userId) {
      return sendErrorResponse(
        res,
        ErrorCode.FORBIDDEN,
        "Only the product owner can view product versions"
      );
    }
    
    // Import ProductVersioningService
    const ProductVersioningService = (await import("../../services/ProductVersioningService")).default;
    
    // Get the specified version
    const version = await ProductVersioningService.getProductVersion(productId, versionNum);
    
    if (!version) {
      return sendErrorResponse(
        res,
        ErrorCode.NOT_FOUND,
        `Version ${versionNum} not found for product ${productId}`
      );
    }
    
    return res.status(200).json({
      success: true,
      data: {
        version
      }
    });
  } catch (error) {
    console.error("Error getting product version:", error);
    return sendErrorResponse(
      res,
      ErrorCode.GENERAL_ERROR,
      "Error retrieving product version",
      error instanceof Error ? error.message : undefined
    );
  }
});

/**
 * @swagger
 * /product/{productId}/version/latest:
 *   get:
 *     summary: Get the latest version of a product
 *     tags: [Products, Versioning]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the product
 *     responses:
 *       200:
 *         description: Latest product version
 *       403:
 *         description: Unauthorized - only product owner can view version
 *       404:
 *         description: Product or version not found
 */
router.get("/:productId/version/latest", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const userId = req.user?.id;

    // Get product to check if it exists and validate ownership
    const product = await ProductService.getProduct(productId);
    
    if (!product) {
      return sendErrorResponse(
        res,
        ErrorCode.PRODUCT_NOT_FOUND,
        `Product with ID ${productId} not found`
      );
    }
    
    // Check if the user is the product owner
    if (product.ownerId !== userId) {
      return sendErrorResponse(
        res,
        ErrorCode.FORBIDDEN,
        "Only the product owner can view product versions"
      );
    }
    
    // Import ProductVersioningService
    const ProductVersioningService = (await import("../../services/ProductVersioningService")).default;
    
    // Get the latest version
    const version = await ProductVersioningService.getLatestVersion(productId);
    
    if (!version) {
      return sendErrorResponse(
        res,
        ErrorCode.NOT_FOUND,
        `No versions found for product ${productId}`
      );
    }
    
    return res.status(200).json({
      success: true,
      data: {
        version
      }
    });
  } catch (error) {
    console.error("Error getting latest product version:", error);
    return sendErrorResponse(
      res,
      ErrorCode.GENERAL_ERROR,
      "Error retrieving latest product version",
      error instanceof Error ? error.message : undefined
    );
  }
});

export default router;