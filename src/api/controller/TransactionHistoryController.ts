import type { Request, Response } from "express";
import { TransactionHistoryService } from "../../core/TransactionHistory";

/**
 * Get transaction history for a specific product
 */
const getProductTransactionHistory = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: productId"
      });
    }

    const transactions = await TransactionHistoryService.getProductTransactionHistory(productId);

    return res.status(200).json({
      success: true,
      data: {
        transactions,
        count: transactions.length
      }
    });
  } catch (error) {
    console.error("Error in getProductTransactionHistory:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching product transaction history"
    });
  }
};

/**
 * Get transaction history for a specific user
 */
const getUserTransactionHistory = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: userId"
      });
    }

    const transactions = await TransactionHistoryService.getUserTransactionHistory(userId, limit);

    return res.status(200).json({
      success: true,
      data: {
        transactions,
        count: transactions.length
      }
    });
  } catch (error) {
    console.error("Error in getUserTransactionHistory:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching user transaction history"
    });
  }
};

export { getProductTransactionHistory, getUserTransactionHistory }; 