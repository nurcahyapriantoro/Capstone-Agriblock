import { 
  DisputeStatus, 
  DisputeType, 
  DisputeResolution, 
  UserRole, 
  TransactionActionType,
  ProductStatus,
  StockChangeReason
} from '../enum';
import { txhashDB } from '../helper/level.db.client';
import { TransactionHistoryService } from './TransactionHistory';
import RoleService from './RoleService';
import { logger } from '../utils/logger';

/**
 * Interface untuk dispute
 */
interface Dispute {
  id: string;
  productId: string;
  transactionId: string;
  complainantId: string;
  complainantRole: UserRole;
  respondentId: string;
  respondentRole: UserRole;
  type: DisputeType;
  status: DisputeStatus;
  description: string;
  evidence: string[];
  createdAt: number;
  updatedAt: number;
  mediatorId?: string;
  resolution?: {
    type: DisputeResolution;
    description: string;
    resolvedAt: number;
    resolvedBy: string;
    compensation?: number;
  };
}

/**
 * Service untuk mengelola dispute/sengketa dalam supply chain
 */
class DisputeResolutionService {
  /**
   * Membuat dispute baru
   */
  static async createDispute(
    productId: string,
    transactionId: string,
    complainantId: string,
    respondentId: string,
    type: DisputeType,
    description: string,
    evidence: string[] = []
  ): Promise<{ success: boolean; disputeId?: string; message?: string }> {
    try {
      // Verify user roles
      const complainantRole = await RoleService.getUserRole(complainantId);
      const respondentRole = await RoleService.getUserRole(respondentId);
      
      if (!complainantRole || !respondentRole) {
        return { 
          success: false, 
          message: 'Invalid user role' 
        };
      }
      
      // Verify transaction exists
      const transaction = await TransactionHistoryService.getTransaction(transactionId);
      if (!transaction) {
        return { 
          success: false, 
          message: 'Transaction not found' 
        };
      }
      
      // Generate unique dispute ID
      const disputeId = `dispute-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create new dispute
      const dispute: Dispute = {
        id: disputeId,
        productId,
        transactionId,
        complainantId,
        complainantRole,
        respondentId,
        respondentRole,
        type,
        status: DisputeStatus.PENDING,
        description,
        evidence,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      // Store the dispute
      await txhashDB.put(`dispute:${disputeId}`, JSON.stringify(dispute));
      
      // Also index by product and users involved
      await txhashDB.put(`product:${productId}:dispute:${disputeId}`, disputeId);
      await txhashDB.put(`user:${complainantId}:dispute:${disputeId}`, disputeId);
      await txhashDB.put(`user:${respondentId}:dispute:${disputeId}`, disputeId);
      
      // Record the dispute in the transaction history
      await TransactionHistoryService.recordProductStatusUpdate(
        productId,
        complainantId,
        complainantRole,
        ProductStatus.DISPUTED,
        {
          disputeId,
          transactionId,
          type,
          description: description.substring(0, 100) // Truncate for history record
        }
      );
      
      logger.info(`Dispute created: ${disputeId}`, {
        disputeId,
        productId,
        transactionId,
        complainantId,
        respondentId
      });
      
      return {
        success: true,
        disputeId,
        message: 'Dispute created successfully'
      };
    } catch (error) {
      logger.error('Error creating dispute:', error);
      return {
        success: false,
        message: 'Failed to create dispute'
      };
    }
  }
  
  /**
   * Assign mediator untuk sebuah dispute
   */
  static async assignMediator(
    disputeId: string,
    mediatorId: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // Verify mediator role
      const mediatorRole = await RoleService.getUserRole(mediatorId);
      if (mediatorRole !== UserRole.MEDIATOR && mediatorRole !== UserRole.ADMIN) {
        return {
          success: false,
          message: 'User is not authorized to mediate disputes'
        };
      }
      
      // Get the dispute
      const dispute = await this.getDispute(disputeId);
      if (!dispute) {
        return {
          success: false,
          message: 'Dispute not found'
        };
      }
      
      // Update dispute status
      dispute.status = DisputeStatus.UNDER_REVIEW;
      dispute.mediatorId = mediatorId;
      dispute.updatedAt = Date.now();
      
      // Save updated dispute
      await txhashDB.put(`dispute:${disputeId}`, JSON.stringify(dispute));
      
      logger.info(`Mediator assigned to dispute: ${disputeId}`, {
        disputeId,
        mediatorId
      });
      
      return {
        success: true,
        message: 'Mediator assigned successfully'
      };
    } catch (error) {
      logger.error('Error assigning mediator:', error);
      return {
        success: false,
        message: 'Failed to assign mediator'
      };
    }
  }
  
  /**
   * Resolve a dispute
   */
  static async resolveDispute(
    disputeId: string,
    resolverId: string,
    resolution: {
      type: DisputeResolution;
      description: string;
      compensation?: number;
    }
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // Get the dispute
      const dispute = await this.getDispute(disputeId);
      if (!dispute) {
        return {
          success: false,
          message: 'Dispute not found'
        };
      }
      
      // Verify resolver role
      const resolverRole = await RoleService.getUserRole(resolverId);
      if (
        resolverRole !== UserRole.MEDIATOR && 
        resolverRole !== UserRole.ADMIN &&
        resolverId !== dispute.mediatorId
      ) {
        return {
          success: false,
          message: 'User is not authorized to resolve this dispute'
        };
      }
      
      // Update dispute
      dispute.status = DisputeStatus.RESOLVED;
      dispute.resolution = {
        type: resolution.type,
        description: resolution.description,
        resolvedAt: Date.now(),
        resolvedBy: resolverId,
        compensation: resolution.compensation
      };
      dispute.updatedAt = Date.now();
      
      // Save updated dispute
      await txhashDB.put(`dispute:${disputeId}`, JSON.stringify(dispute));
      
      // Record resolution in transaction history
      await TransactionHistoryService.recordStockChange(
        dispute.productId,
        resolverId,
        resolverRole as UserRole,
        0, // Not changing stock level
        TransactionActionType.RESOLVE_DISPUTE,
        StockChangeReason.ADJUSTMENT,
        {
          disputeId,
          resolution: resolution.type,
          description: resolution.description.substring(0, 100)
        }
      );
      
      logger.info(`Dispute resolved: ${disputeId}`, {
        disputeId,
        resolverId,
        resolutionType: resolution.type
      });
      
      return {
        success: true,
        message: 'Dispute resolved successfully'
      };
    } catch (error) {
      logger.error('Error resolving dispute:', error);
      return {
        success: false,
        message: 'Failed to resolve dispute'
      };
    }
  }
  
  /**
   * Get dispute by ID
   */
  static async getDispute(disputeId: string): Promise<Dispute | null> {
    try {
      const disputeJson = await txhashDB.get(`dispute:${disputeId}`);
      return JSON.parse(disputeJson) as Dispute;
    } catch (error) {
      if ((error as any).code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      logger.error(`Error getting dispute ${disputeId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all disputes for a product
   */
  static async getDisputesByProduct(productId: string): Promise<Dispute[]> {
    const disputes: Dispute[] = [];
    
    try {
      // Use iterator to find all disputes for this product
      // Note: This would be more efficient with a proper index in a production database
      const iterator = txhashDB.iterator({
        gt: `product:${productId}:dispute:`,
        lt: `product:${productId}:dispute:\xff`
      });
      
      for await (const [key, value] of iterator) {
        const disputeId = value.toString();
        const dispute = await this.getDispute(disputeId);
        if (dispute) {
          disputes.push(dispute);
        }
      }
      
      return disputes;
    } catch (error) {
      logger.error(`Error getting disputes for product ${productId}:`, error);
      return [];
    }
  }
  
  /**
   * Get disputes by user (either complainant or respondent)
   */
  static async getDisputesByUser(userId: string): Promise<Dispute[]> {
    const disputes: Dispute[] = [];
    
    try {
      // Use iterator to find all disputes for this user
      const iterator = txhashDB.iterator({
        gt: `user:${userId}:dispute:`,
        lt: `user:${userId}:dispute:\xff`
      });
      
      for await (const [key, value] of iterator) {
        const disputeId = value.toString();
        const dispute = await this.getDispute(disputeId);
        if (dispute) {
          disputes.push(dispute);
        }
      }
      
      return disputes;
    } catch (error) {
      logger.error(`Error getting disputes for user ${userId}:`, error);
      return [];
    }
  }
}

export default DisputeResolutionService; 