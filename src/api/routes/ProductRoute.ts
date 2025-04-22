import express from "express";
import { 
  createProduct, 
  getProduct, 
  getProductsByOwner, 
  transferOwnership 
} from "../controller/ProductController";

const router = express.Router();

// POST create a new product
router.post("/", createProduct);

// GET a product by ID
router.get("/:productId", getProduct);

// GET all products owned by a specific user
router.get("/owner/:ownerId", getProductsByOwner);

// POST transfer ownership of a product
router.post("/transfer", transferOwnership);

export default router; 