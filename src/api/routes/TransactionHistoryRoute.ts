import express from "express";
import { 
  getProductTransactionHistory,
  getUserTransactionHistory
} from "../controller/TransactionHistoryController";

const router = express.Router();

// GET transaction history for a specific product
router.get("/product/:productId", getProductTransactionHistory);

// GET transaction history for a specific user
router.get("/user/:userId", getUserTransactionHistory);

export default router; 