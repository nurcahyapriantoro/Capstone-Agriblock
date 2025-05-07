import express, { Request, Response } from "express";
import { 
  createProduct, 
  getProduct, 
  getProductsByOwner 
} from "../controller/ProductController";
import ProductImageController from "../controller/ProductImageController";
import ProductTransferController from "../controller/ProductTransferController";
import ProductManagementController from "../controller/ProductManagementController";
import { container } from 'tsyringe';
import { productCreationRateLimiter } from "../../middleware/rateLimiter";
import { authenticateJWT } from "../../middleware/auth";
import { uploadImage, handleUploadErrors, uploadToImageKit } from "../../middleware/uploadLimiter";
import { UserRole } from '../../enum';
import { trackProductView, trackProductTransaction } from "../../middleware/productAnalytics";

const router = express.Router();
const productManagementController = container.resolve(ProductManagementController);

// Add body parser middleware
router.use(express.json());

// Helper function to check if user is a farmer
const isFarmer = (req: Request): boolean => {
  return req.user?.role === UserRole.FARMER;
};

// Middleware to ensure only farmers can create products
const ensureFarmerAccess = (req: Request, res: Response, next: Function) => {
  if (!isFarmer(req)) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only farmers can create products."
    });
  }
  next();
};

// Create a new product
router.post("/", authenticateJWT, ensureFarmerAccess, productCreationRateLimiter, createProduct);

// Upload product images to ImageKit
router.post(
  "/upload-image/:productId", 
  authenticateJWT, 
  ProductImageController.validateProductOwnership,
  uploadImage.array('images', 5),
  handleUploadErrors,
  uploadToImageKit,
  ProductImageController.handleSuccessfulUpload
);

// Get ImageKit authentication parameters
router.get("/imagekit/auth", authenticateJWT, ProductImageController.getImageKitAuth);

// Delete an image from ImageKit
router.delete("/images/:fileId", authenticateJWT, ProductImageController.deleteImage);

// Get the latest status of a product
router.get("/status/:productId", productManagementController.getProductStatus);

// Get product by ID
router.get("/:productId", trackProductView, getProduct);

// Get all images for a product from ImageKit
router.get("/:productId/images", ProductImageController.getProductImages);

// Get all products owned by a specific user
router.get("/owner/:ownerId", getProductsByOwner);

// Transfer product ownership and automatically update status
// Produk akan otomatis di-receive saat transfer antar role
router.post("/transfer", authenticateJWT, trackProductTransaction, ProductTransferController.transferProduct);

// === Product Management Endpoints ===

// Mark product as sold and update status
router.post("/sell", authenticateJWT, productManagementController.sellProduct);

// Recall a product and update status
router.post("/recall", authenticateJWT, productManagementController.recallProduct);

// Verify product quality and update status
router.post("/verify", authenticateJWT, productManagementController.verifyProduct);

// Get all recalled products
router.get("/recalled", productManagementController.getRecalledProducts);

// === Product Verification Consensus Endpoints ===

// Get verification status and consensus information for a product
router.get("/verifications/:productId", productManagementController.getProductVerifications);

// Check if consensus has been reached and update product status if needed
router.post("/check-consensus/:productId", authenticateJWT, productManagementController.checkVerificationConsensus);

// Get consensus status for a product
router.get("/consensus/:productId", productManagementController.getProductVerifications);

export default router;