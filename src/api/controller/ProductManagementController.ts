import type { Request, Response } from "express";
import { ProductStatus, RecallReason } from "../../enum";
import ProductManagement from "../../core/ProductManagement";
import { TransactionHistoryService } from "../../core/TransactionHistory";

/**
 * Update the status of a product
 */
const updateProductStatus = async (req: Request, res: Response) => {
  try {
    const { productId, userId, status, details } = req.body;

    if (!productId || !userId || !status) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: productId, userId, and status are required"
      });
    }

    // Validate that the status is a valid ProductStatus
    if (!Object.values(ProductStatus).includes(status as ProductStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status specified"
      });
    }

    // Create product management instance
    const productManagement = new ProductManagement(productId, userId);
    
    // Update product status
    const result = await productManagement.updateProductStatus(status as ProductStatus, details);

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: {
          transactionId: result.transactionId
        },
        message: result.message
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error("Error in updateProductStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating product status"
    });
  }
};

/**
 * Recall a product
 */
const recallProduct = async (req: Request, res: Response) => {
  try {
    const { productId, userId, reason, details } = req.body;

    if (!productId || !userId || !reason) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: productId, userId, and reason are required"
      });
    }

    // Validate that the reason is a valid RecallReason
    if (!Object.values(RecallReason).includes(reason as RecallReason)) {
      return res.status(400).json({
        success: false,
        message: "Invalid recall reason specified"
      });
    }

    // Create product management instance
    const productManagement = new ProductManagement(productId, userId);
    
    // Recall the product
    const result = await productManagement.recallProduct(reason as RecallReason, details);

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: {
          transactionId: result.transactionId
        },
        message: result.message
      });
    } else {
      return res.status(403).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error("Error in recallProduct:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while recalling product"
    });
  }
};

/**
 * Verify a product against quality and safety standards
 */
const verifyProduct = async (req: Request, res: Response) => {
  try {
    const { productId, userId, criteria, details } = req.body;

    if (!productId || !userId || !criteria) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: productId, userId, and criteria are required"
      });
    }

    // Validate criteria structure (at minimum it should be an object)
    if (typeof criteria !== 'object' || criteria === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid criteria format. Object expected."
      });
    }

    // Create product management instance
    const productManagement = new ProductManagement(productId, userId);
    
    // Process dates if they exist in the criteria
    const processedCriteria = { ...criteria };
    if (criteria.expirationDate) {
      processedCriteria.expirationDate = new Date(criteria.expirationDate);
    }
    
    // Verify the product
    const result = await productManagement.verifyProduct(processedCriteria, details);

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: {
          transactionId: result.transactionId
        },
        message: result.message
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message,
        data: {
          transactionId: result.transactionId
        }
      });
    }
  } catch (error) {
    console.error("Error in verifyProduct:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while verifying product"
    });
  }
};

/**
 * Get all recalled products
 */
const getRecalledProducts = async (_req: Request, res: Response) => {
  try {
    const recalledProducts = await TransactionHistoryService.getRecalledProducts();

    return res.status(200).json({
      success: true,
      data: {
        products: recalledProducts,
        count: recalledProducts.length
      }
    });
  } catch (error) {
    console.error("Error in getRecalledProducts:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching recalled products"
    });
  }
};

/**
 * Get the latest status of a product
 */
const getProductStatus = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: productId"
      });
    }

    const statusRecord = await TransactionHistoryService.getLatestProductStatus(productId);

    if (statusRecord) {
      return res.status(200).json({
        success: true,
        data: {
          productId,
          status: statusRecord.productStatus,
          lastUpdated: new Date(statusRecord.timestamp),
          transactionId: statusRecord.id,
          details: statusRecord.details
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
      message: "Internal server error while fetching product status"
    });
  }
};

export { 
  updateProductStatus,
  recallProduct,
  verifyProduct,
  getRecalledProducts,
  getProductStatus
}; 