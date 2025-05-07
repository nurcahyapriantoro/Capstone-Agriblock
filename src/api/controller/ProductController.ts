import type { Request, Response } from "express";
import { UserRole } from "../../enum";
import ProductService from "../../core/ProductService";
import { ProductStatus } from "../../enum";
import { ContractRegistry } from "../../contracts/ContractRegistry";

// ID kontrak untuk pengelolaan produk
const contractId = 'product-management-v1';

/**
 * Create a new product (only farmers can do this)
 */
const createProduct = async (req: Request, res: Response) => {
  try {
    const { 
      farmerId, 
      name, 
      description, 
      initialQuantity, 
      quantity, 
      price, 
      metadata, 
      unit,
      productName,
      location,
      productionDate,
      expiryDate,
      ...otherFields 
    } = req.body;

    // Validate that farmerId matches authenticated user ID
    if (farmerId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        message: "FarmerId must match authenticated user ID"
      });
    }

    if (!farmerId || !name || !productName) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: farmerId, name, and productName are required"
      });
    }

    // Pastikan quantity tidak undefined
    const productQuantity = quantity || initialQuantity || 0;

    // Combine metadata dan fields tambahan
    const productMetadata = {
      ...(metadata || {}),
      unit,
      location,
      productionDate,
      expiryDate,
      ...otherFields
    };

    console.log("Creating product with data:", {
      farmerId,
      name,
      productName,
      description,
      quantity: productQuantity,
      price,
      metadata: productMetadata
    });

    // Simpan produk di database dan daftarkan ke blockchain
    const result = await ProductService.createProduct(
      farmerId, 
      {
        name,
        description,
        quantity: productQuantity,
        price,
        metadata: productMetadata,
        status: ProductStatus.CREATED
      },
      {
        productName: productName,
        unit,
        location,
        productionDate,
        expiryDate,
        ...otherFields
      }
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        productId: result.productId,
        transactionId: result.transactionId,
        blockchainRegistered: result.blockchainRegistered,
        blockchainTransactionId: result.blockchainTransactionId
      },
      message: result.message
    });
  } catch (error) {
    console.error("Error in createProduct:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating product"
    });
  }
};

/**
 * Get a product by its ID
 */
const getProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: productId"
      });
    }

    const product = await ProductService.getProduct(productId);

    if (product) {
      return res.status(200).json({
        success: true,
        data: {
          product
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
  } catch (error) {
    console.error("Error in getProduct:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching product"
    });
  }
};

/**
 * Get all products owned by a specific user
 */
const getProductsByOwner = async (req: Request, res: Response) => {
  try {
    const { ownerId } = req.params;

    if (!ownerId) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: ownerId"
      });
    }

    const products = await ProductService.getProductsByOwner(ownerId);

    return res.status(200).json({
      success: true,
      data: {
        products,
        count: products.length
      }
    });
  } catch (error) {
    console.error("Error in getProductsByOwner:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching products by owner"
    });
  }
};

/**
 * Transfer ownership of a product from one user to another
 */
const transferOwnership = async (req: Request, res: Response) => {
  try {
    // Support both naming conventions
    const { 
      productId, 
      fromUserId, toUserId,           // new format
      currentOwnerId, newOwnerId,     // old format
      role, 
      details 
    } = req.body;

    console.log("Transfer ownership request:", {
      productId,
      fromUserId: fromUserId || currentOwnerId,
      toUserId: toUserId || newOwnerId,
      role,
      authenticatedUserId: req.user?.id,
      authenticatedUserRole: req.user?.role
    });

    // Validate each field with specific messages
    const errors = [];
    
    if (!productId) {
      errors.push("productId is required and must be a valid product ID (format: prod-xxxxxxxxx)");
    }

    // Check both old and new format fields
    const effectiveCurrentOwnerId = currentOwnerId || fromUserId;
    const effectiveNewOwnerId = newOwnerId || toUserId;

    // Validate that the authenticated user is the one transferring the product
    if (effectiveCurrentOwnerId !== req.user?.id) {
      errors.push("You can only transfer products that you own");
    }

    if (!effectiveCurrentOwnerId) {
      errors.push("currentOwnerId/fromUserId is required and must be a valid user ID (format: FARM-xxx, COLL-xxx, etc)");
    }

    if (!effectiveNewOwnerId) {
      errors.push("newOwnerId/toUserId is required and must be a valid user ID (format: FARM-xxx, COLL-xxx, etc)");
    }

    if (!role) {
      errors.push(`role is required and must be one of: ${Object.values(UserRole).join(", ")}`);
    } else if (!Object.values(UserRole).includes(role as UserRole)) {
      errors.push(`Invalid role. Must be one of: ${Object.values(UserRole).join(", ")}`);
    }

    // If there are any validation errors, return them all
    if (errors.length > 0) {
      console.log("Validation errors:", errors);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors
      });
    }

    const result = await ProductService.transferOwnership({
      productId,
      currentOwnerId: effectiveCurrentOwnerId,
      newOwnerId: effectiveNewOwnerId,
      role: role as UserRole,
      details
    });

    console.log("Transfer result:", result);

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
    console.error("Error in transferOwnership:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while transferring product ownership"
    });
  }
};

export { createProduct, getProduct, getProductsByOwner, transferOwnership };