import express from "express";
import { 
  updateProductStatus,
  recallProduct,
  verifyProduct,
  getRecalledProducts,
  getProductStatus
} from "../controller/ProductManagementController";

const router = express.Router();

// POST update product status
router.post("/status", updateProductStatus);

// POST recall a product
router.post("/recall", recallProduct);

// POST verify product quality
router.post("/verify", verifyProduct);

// GET all recalled products
router.get("/recalled", getRecalledProducts);

// GET the latest status of a product
router.get("/status/:productId", getProductStatus);

export default router; 