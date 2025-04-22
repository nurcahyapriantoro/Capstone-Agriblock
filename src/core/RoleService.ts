import { UserRole, TransactionAction } from "../enum";
import RoleValidation from "./RoleValidation";
import { txhashDB } from "../helper/level.db.client";

class RoleService {
  /**
   * Get a user's role from the blockchain or user database
   * @param userId The user's ID or public key
   * @returns The role of the user or null if not found
   */
  static async getUserRole(userId: string): Promise<UserRole | null> {
    try {
      // In a real implementation, this would query the blockchain or a database
      // to get the user's registered role.
      // This is a simplified implementation for demonstration.
      
      // You would typically check a user roles database or a special blockchain transaction
      // that registered the user's role.
      
      // Placeholder implementation
      // In a real scenario, you might check the blockchain for a "REGISTER_ROLE" transaction
      const userRoleData = await this.getUserRoleFromTransactions(userId);
      return userRoleData;
    } catch (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
  }

  /**
   * Example method to get user role from transaction history
   * In a real implementation, this would search the blockchain
   */
  private static async getUserRoleFromTransactions(userId: string): Promise<UserRole | null> {
    try {
      // Format ID user menggunakan 4 huruf pertama dari role dalam uppercase
      // Contoh: FARM-xxx untuk petani, COLL-xxx untuk kolektor, dll.
      
      // Implementasi standar berdasarkan prefix
      if (userId.startsWith("FARM")) {
        return UserRole.FARMER;
      } else if (userId.startsWith("COLL")) {
        return UserRole.COLLECTOR;
      } else if (userId.startsWith("TRAD")) {
        return UserRole.TRADER;
      } else if (userId.startsWith("RETA")) {
        return UserRole.RETAILER;
      } else if (userId.startsWith("CONS")) {
        return UserRole.CONSUMER;
      }
      
      // Backward compatibility - untuk format lama (jika ada)
      // Ini hanya temporary dan sebaiknya dihapus setelah migrasi lengkap
      if (userId.startsWith("farmer-")) {
        return UserRole.FARMER;
      } else if (userId.startsWith("collector-")) {
        return UserRole.COLLECTOR;
      } else if (userId.startsWith("trader-")) {
        return UserRole.TRADER;
      } else if (userId.startsWith("retailer-")) {
        return UserRole.RETAILER;
      } else if (userId.startsWith("consumer-")) {
        return UserRole.CONSUMER;
      }
      
      return null;
    } catch (error) {
      console.error("Error retrieving user role from transactions:", error);
      return null;
    }
  }

  /**
   * Validate if a user can perform a specific action
   * @param userId The user's ID or public key
   * @param action The transaction action to perform
   * @returns Result of validation with status and optional message
   */
  static async validateUserAction(
    userId: string, 
    action: TransactionAction
  ): Promise<{ isValid: boolean; message?: string }> {
    // Get the user's role
    const userRole = await this.getUserRole(userId);
    
    if (!userRole) {
      return { 
        isValid: false, 
        message: "User role not found. User may not be registered." 
      };
    }
    
    // Create a validation instance and validate the action
    const validator = new RoleValidation(userId, userRole, action);
    return validator.validate();
  }

  /**
   * Validate a transaction between two users
   * @param fromUserId The sender's user ID
   * @param toUserId The receiver's user ID
   * @param action The transaction action
   * @returns Result of validation with status and optional message
   */
  static async validateTransaction(
    fromUserId: string,
    toUserId: string,
    action: TransactionAction
  ): Promise<{ isValid: boolean; message?: string }> {
    // Get both users' roles
    const fromRole = await this.getUserRole(fromUserId);
    const toRole = await this.getUserRole(toUserId);
    
    if (!fromRole) {
      return { 
        isValid: false, 
        message: "Sender role not found. User may not be registered." 
      };
    }
    
    if (!toRole) {
      return { 
        isValid: false, 
        message: "Receiver role not found. User may not be registered." 
      };
    }
    
    // Create a validation instance and validate the transaction
    const validator = new RoleValidation(fromUserId, fromRole, action);
    return validator.validateTransaction(fromRole, toRole);
  }
}

export default RoleService; 