import { UserRole, TransactionAction } from "../enum";

interface ValidationResult {
  isValid: boolean;
  message?: string;
}

class RoleValidation {
  private userId: string;
  private role: UserRole;
  private transactionType: TransactionAction;

  constructor(userId: string, role: UserRole, transactionType: TransactionAction) {
    this.userId = userId;
    this.role = role;
    this.transactionType = transactionType;
  }

  /**
   * Validates if a user with a specific role can perform the requested transaction action
   * @returns Validation result with status and optional message
   */
  validate(): ValidationResult {
    switch (this.role) {
      case UserRole.FARMER:
        return this.validateFarmer();
      case UserRole.COLLECTOR:
        return this.validateCollector();
      case UserRole.TRADER:
        return this.validateTrader();
      case UserRole.RETAILER:
        return this.validateRetailer();
      case UserRole.CONSUMER:
        return this.validateConsumer();
      default:
        return {
          isValid: false,
          message: "Invalid role specified."
        };
    }
  }

  private validateFarmer(): ValidationResult {
    // Farmers can add new products
    if (this.transactionType === TransactionAction.ADD_PRODUCT) {
      return { isValid: true };
    }
    
    // Farmers can view history
    if (this.transactionType === TransactionAction.VIEW_HISTORY) {
      return { isValid: true };
    }
    
    // Farmers can sell products to collectors
    if (this.transactionType === TransactionAction.SELL_PRODUCT) {
      return { isValid: true };
    }
    
    return {
      isValid: false,
      message: "Farmers can only add new products, sell products, or view history."
    };
  }

  private validateCollector(): ValidationResult {
    // Collectors can buy from farmers and sell to traders
    if (this.transactionType === TransactionAction.BUY_PRODUCT || 
        this.transactionType === TransactionAction.SELL_PRODUCT) {
      return { isValid: true };
    }
    
    // Collectors can also view history
    if (this.transactionType === TransactionAction.VIEW_HISTORY) {
      return { isValid: true };
    }
    
    return {
      isValid: false,
      message: "Collectors can only buy products from farmers, sell to traders, or view history."
    };
  }

  private validateTrader(): ValidationResult {
    // Traders can buy from collectors and sell to retailers
    if (this.transactionType === TransactionAction.BUY_PRODUCT || 
        this.transactionType === TransactionAction.SELL_PRODUCT) {
      return { isValid: true };
    }
    
    // Traders can also view history
    if (this.transactionType === TransactionAction.VIEW_HISTORY) {
      return { isValid: true };
    }
    
    return {
      isValid: false,
      message: "Traders can only buy products from collectors, sell to retailers, or view history."
    };
  }

  private validateRetailer(): ValidationResult {
    // Retailers can only buy from traders
    if (this.transactionType === TransactionAction.BUY_PRODUCT) {
      return { isValid: true };
    }
    
    // Retailers can also view history
    if (this.transactionType === TransactionAction.VIEW_HISTORY) {
      return { isValid: true };
    }
    
    return {
      isValid: false,
      message: "Retailers can only buy products from traders or view history."
    };
  }

  private validateConsumer(): ValidationResult {
    // Consumers can only view history
    if (this.transactionType === TransactionAction.VIEW_HISTORY) {
      return { isValid: true };
    }
    
    return {
      isValid: false,
      message: "Consumers can only view product and transaction history."
    };
  }

  /**
   * Extended validation that checks both role permissions and validates 
   * the specific transaction parties (from/to) based on their roles
   */
  validateTransaction(fromRole: UserRole, toRole: UserRole): ValidationResult {
    // First check if the action is valid for this role
    const basicValidation = this.validate();
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    // Now check if the transaction parties are valid for this action
    switch (this.transactionType) {
      case TransactionAction.SELL_PRODUCT:
        return this.validateSellTransaction(fromRole, toRole);
      case TransactionAction.BUY_PRODUCT:
        return this.validateBuyTransaction(fromRole, toRole);
      default:
        return basicValidation;
    }
  }

  private validateSellTransaction(fromRole: UserRole, toRole: UserRole): ValidationResult {
    // Validate that the seller is selling to the correct type of buyer
    switch (fromRole) {
      case UserRole.FARMER:
        if (toRole !== UserRole.COLLECTOR) {
          return {
            isValid: false,
            message: "Farmers can only sell to collectors."
          };
        }
        break;
      case UserRole.COLLECTOR:
        if (toRole !== UserRole.TRADER) {
          return {
            isValid: false,
            message: "Collectors can only sell to traders."
          };
        }
        break;
      case UserRole.TRADER:
        if (toRole !== UserRole.RETAILER) {
          return {
            isValid: false,
            message: "Traders can only sell to retailers."
          };
        }
        break;
      default:
        return {
          isValid: false,
          message: "Invalid seller role for this transaction."
        };
    }

    return { isValid: true };
  }

  private validateBuyTransaction(fromRole: UserRole, toRole: UserRole): ValidationResult {
    // Validate that the buyer is buying from the correct type of seller
    switch (toRole) {
      case UserRole.COLLECTOR:
        if (fromRole !== UserRole.FARMER) {
          return {
            isValid: false,
            message: "Collectors can only buy from farmers."
          };
        }
        break;
      case UserRole.TRADER:
        if (fromRole !== UserRole.COLLECTOR) {
          return {
            isValid: false,
            message: "Traders can only buy from collectors."
          };
        }
        break;
      case UserRole.RETAILER:
        if (fromRole !== UserRole.TRADER) {
          return {
            isValid: false,
            message: "Retailers can only buy from traders."
          };
        }
        break;
      default:
        return {
          isValid: false,
          message: "Invalid buyer role for this transaction."
        };
    }

    return { isValid: true };
  }
}

export default RoleValidation; 