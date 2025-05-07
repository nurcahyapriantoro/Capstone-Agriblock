import type { Request, Response } from "express";
import { UserRole, TransactionAction } from "../../enum";
import { ContractRegistry } from "../../contracts/ContractRegistry";

// ID kontrak untuk validasi peran
const contractId = 'role-validation-v1';

/**
 * Validate if a user can perform a specific action
 */
const validateUserAction = async (req: Request, res: Response) => {
  try {
    const { userId, action } = req.body;

    if (!userId || !action) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: userId and action are required"
      });
    }

    // Validate that the action is a valid TransactionAction
    if (!Object.values(TransactionAction).includes(action as TransactionAction)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action specified"
      });
    }

    // Panggil smart contract melalui ContractRegistry
    const registry = ContractRegistry.getInstance();
    const validationResult = await registry.executeContract(
      contractId,
      'validateUserAction',
      { userId, action },
      req.body.sender || 'system'  // Gunakan sender jika disediakan, atau default ke 'system'
    );

    if (validationResult.isValid) {
      return res.status(200).json({
        success: true,
        message: "User is authorized to perform this action"
      });
    } else {
      return res.status(403).json({
        success: false,
        message: validationResult.message || "User is not authorized to perform this action"
      });
    }
  } catch (error) {
    console.error("Error in validateUserAction:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while validating user action"
    });
  }
};

/**
 * Validate a transaction between two users
 */
const validateTransaction = async (req: Request, res: Response) => {
  try {
    const { fromUserId, toUserId, action } = req.body;

    if (!fromUserId || !toUserId || !action) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: fromUserId, toUserId, and action are required"
      });
    }

    // Validate that the action is a valid TransactionAction
    if (!Object.values(TransactionAction).includes(action as TransactionAction)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action specified"
      });
    }

    // Panggil smart contract melalui ContractRegistry
    const registry = ContractRegistry.getInstance();
    const validationResult = await registry.executeContract(
      contractId,
      'validateTransaction',
      { fromUserId, toUserId, action },
      req.body.sender || 'system'  // Gunakan sender jika disediakan, atau default ke 'system'
    );

    if (validationResult.isValid) {
      return res.status(200).json({
        success: true,
        message: "Transaction is valid based on user roles"
      });
    } else {
      return res.status(403).json({
        success: false,
        message: validationResult.message || "Transaction is not valid based on user roles"
      });
    }
  } catch (error) {
    console.error("Error in validateTransaction:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while validating transaction"
    });
  }
};

/**
 * Get a user's role
 */
const getUserRole = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: userId"
      });
    }

    // Panggil smart contract melalui ContractRegistry
    const registry = ContractRegistry.getInstance();
    const result = await registry.queryContract(
      contractId,
      'getUserRole',
      { userId }
    );

    if (result.success) {
      return res.status(200).json({
        success: true,
        data: {
          userId,
          role: result.role
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "User role not found. User may not be registered."
      });
    }
  } catch (error) {
    console.error("Error in getUserRole:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while retrieving user role"
    });
  }
};

export { validateUserAction, validateTransaction, getUserRole }; 