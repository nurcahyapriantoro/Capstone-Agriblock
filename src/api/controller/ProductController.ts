import type { Request, Response } from "express";
import { UserRole } from "../../enum";
import ProductService from "../../core/ProductService";
import { ProductStatus } from "../../enum";

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

    if (!farmerId || !name) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: farmerId and name are required"
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
      description,
      quantity: productQuantity,
      price,
      metadata: productMetadata
    });

    const result = await ProductService.createProduct(
      farmerId, 
      {
        name,
        description,
        quantity: productQuantity,
        price,
        metadata: productMetadata,
        status: ProductStatus.ACTIVE
      },
      {
        productName: productName || name,
        ...otherFields
      }
    );

    if (result.success) {
      return res.status(201).json({
        success: true,
        data: {
          productId: result.productId,
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
    const { productId, currentOwnerId, newOwnerId, role, details } = req.body;

    if (!productId || !currentOwnerId || !newOwnerId || !role) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: productId, currentOwnerId, newOwnerId, and role are required"
      });
    }

    // Validate that the role is a valid UserRole
    if (!Object.values(UserRole).includes(role as UserRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified"
      });
    }

    const result = await ProductService.transferOwnership({
      productId,
      currentOwnerId,
      newOwnerId,
      role: role as UserRole,
      details
    });

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