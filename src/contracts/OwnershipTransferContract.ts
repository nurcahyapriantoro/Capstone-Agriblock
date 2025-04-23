import { SmartContract } from './ISmartContract';
import { Level } from 'level';
import { UserRole, ProductStatus, TransactionActionType } from '../enum';
import { ContractRegistry } from './ContractRegistry';

/**
 * Product data for ownership management
 */
interface ProductData {
  id: string;
  ownerId: string;
  status: ProductStatus;
  name: string;
  description?: string;
  quantity?: number;
  price?: number;
  metadata?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

/**
 * Transfer operation result
 */
interface TransferResult {
  success: boolean;
  message?: string;
  product?: ProductData;
  transactionId?: string;
}

/**
 * Smart contract for handling ownership transfers in the supply chain
 * Enforces role-based transfer rules
 */
export class OwnershipTransferContract extends SmartContract {
  // Contract dependency IDs
  private roleValidationContractId: string = 'role-validation-v1';
  private transactionHistoryContractId: string = 'transaction-history-v1';
  
  constructor(stateDB: Level<string, string>) {
    super(
      'ownership-transfer-v1',
      'OwnershipTransfer',
      '1.0.0',
      stateDB
    );
  }
  
  /**
   * Initialize the contract
   */
  public async initialize(): Promise<boolean> {
    try {
      // Nothing specific to initialize for this contract
      return true;
    } catch (error) {
      console.error('Failed to initialize OwnershipTransfer contract:', error);
      return false;
    }
  }
  
  /**
   * Execute a contract method
   * @param method Method to execute
   * @param params Method parameters
   * @param sender Identity of the caller
   */
  public async execute(method: string, params: any, sender: string): Promise<any> {
    // Verify sender is authorized to call this method
    const authorized = await this.verifySender(sender, method);
    if (!authorized) {
      throw new Error(`Unauthorized: User ${sender} cannot execute method ${method}`);
    }
    
    switch (method) {
      case 'transferOwnership':
        return this.transferOwnership(
          params.productId,
          sender, // currentOwnerId is the sender
          params.newOwnerId
        );
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }
  
  /**
   * Query contract state
   * @param method Method to query
   * @param params Method parameters
   */
  public async query(method: string, params: any): Promise<any> {
    switch (method) {
      case 'canTransferOwnership':
        return this.canTransferOwnership(
          params.productId,
          params.currentOwnerId,
          params.newOwnerId
        );
      case 'getTransferHistory':
        return this.getTransferHistory(params.productId);
      case 'getCurrentOwner':
        return this.getCurrentOwner(params.productId);
      default:
        throw new Error(`Unknown query method: ${method}`);
    }
  }
  
  /**
   * Get schema for this contract's state
   */
  public getStateSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        products: {
          type: 'object',
          patternProperties: {
            '^.*$': {
              type: 'object',
              properties: {
                id: { type: 'string' },
                ownerId: { type: 'string' },
                status: { type: 'string', enum: Object.values(ProductStatus) },
                name: { type: 'string' },
                description: { type: 'string' },
                quantity: { type: 'number' },
                price: { type: 'number' },
                metadata: { type: 'object' },
                createdAt: { type: 'number' },
                updatedAt: { type: 'number' }
              },
              required: ['id', 'ownerId', 'status', 'name', 'createdAt', 'updatedAt']
            }
          }
        }
      }
    };
  }
  
  /**
   * Transfer product ownership from current owner to new owner
   * @param productId ID of the product to transfer
   * @param currentOwnerId Current owner ID (must be the sender)
   * @param newOwnerId ID of the new owner
   */
  private async transferOwnership(
    productId: string,
    currentOwnerId: string,
    newOwnerId: string
  ): Promise<TransferResult> {
    // 1. Get product data
    const product = await this.readState<ProductData>(`product:${productId}`);
    if (!product) {
      return {
        success: false,
        message: `Product with ID ${productId} not found.`
      };
    }
    
    // 2. Verify current owner actually owns the product
    if (product.ownerId !== currentOwnerId) {
      return {
        success: false,
        message: `Current owner ${currentOwnerId} does not own product ${productId}.`
      };
    }
    
    // 3. Check product status - prevent transfer of recalled products
    if (product.status === ProductStatus.RECALLED) {
      return {
        success: false,
        message: `Product ${productId} has been recalled and cannot be transferred.`
      };
    }
    
    // 4. Get roles of both parties from the role validation contract
    const currentOwnerRoleResult = await this.callContract(
      this.roleValidationContractId,
      'query',
      'getUserRole',
      { userId: currentOwnerId },
      null
    );
    
    const newOwnerRoleResult = await this.callContract(
      this.roleValidationContractId,
      'query',
      'getUserRole',
      { userId: newOwnerId },
      null
    );
    
    if (!currentOwnerRoleResult.success || !newOwnerRoleResult.success) {
      return {
        success: false,
        message: currentOwnerRoleResult.success 
          ? `New owner role not found: ${newOwnerRoleResult.message}`
          : `Current owner role not found: ${currentOwnerRoleResult.message}`
      };
    }
    
    const currentOwnerRole = currentOwnerRoleResult.role;
    const newOwnerRole = newOwnerRoleResult.role;
    
    // 5. Validate role-based transfer rules
    const validationResult = this.validateRoleBasedTransfer(currentOwnerRole, newOwnerRole);
    if (!validationResult.success) {
      return validationResult;
    }
    
    // 6. Update product ownership
    product.ownerId = newOwnerId;
    product.updatedAt = Date.now();
    
    // 7. Store updated product data
    await this.writeState<ProductData>(`product:${productId}`, product);
    
    // 8. Record transfer in transaction history
    const transferRecord = await this.callContract(
      this.transactionHistoryContractId,
      'execute',
      'recordProductTransfer',
      {
        productId,
        fromUserId: currentOwnerId,
        fromRole: currentOwnerRole,
        toUserId: newOwnerId,
        toRole: newOwnerRole,
        details: {
          previousOwner: currentOwnerId,
          newOwner: newOwnerId,
          timestamp: product.updatedAt
        }
      },
      currentOwnerId
    );
    
    // 9. Emit ownership transfer event
    await this.emitEvent('OwnershipTransferred', {
      productId,
      previousOwner: currentOwnerId,
      newOwner: newOwnerId,
      timestamp: product.updatedAt
    });
    
    return {
      success: true,
      message: `Product ${productId} ownership successfully transferred from ${currentOwnerId} to ${newOwnerId}.`,
      product,
      transactionId: transferRecord.transactionId
    };
  }
  
  /**
   * Check if an ownership transfer would be allowed
   * @param productId ID of the product to check
   * @param currentOwnerId Current owner ID
   * @param newOwnerId Prospective new owner ID
   */
  private async canTransferOwnership(
    productId: string,
    currentOwnerId: string,
    newOwnerId: string
  ): Promise<TransferResult> {
    // 1. Get product data
    const product = await this.readState<ProductData>(`product:${productId}`);
    if (!product) {
      return {
        success: false,
        message: `Product with ID ${productId} not found.`
      };
    }
    
    // 2. Verify current owner actually owns the product
    if (product.ownerId !== currentOwnerId) {
      return {
        success: false,
        message: `Current owner ${currentOwnerId} does not own product ${productId}.`
      };
    }
    
    // 3. Check product status - prevent transfer of recalled products
    if (product.status === ProductStatus.RECALLED) {
      return {
        success: false,
        message: `Product ${productId} has been recalled and cannot be transferred.`
      };
    }
    
    // 4. Get roles of both parties from the role validation contract
    const currentOwnerRoleResult = await this.callContract(
      this.roleValidationContractId,
      'query',
      'getUserRole',
      { userId: currentOwnerId },
      null
    );
    
    const newOwnerRoleResult = await this.callContract(
      this.roleValidationContractId,
      'query',
      'getUserRole',
      { userId: newOwnerId },
      null
    );
    
    if (!currentOwnerRoleResult.success || !newOwnerRoleResult.success) {
      return {
        success: false,
        message: currentOwnerRoleResult.success 
          ? `New owner role not found: ${newOwnerRoleResult.message}`
          : `Current owner role not found: ${currentOwnerRoleResult.message}`
      };
    }
    
    const currentOwnerRole = currentOwnerRoleResult.role;
    const newOwnerRole = newOwnerRoleResult.role;
    
    // 5. Validate role-based transfer rules
    return this.validateRoleBasedTransfer(currentOwnerRole, newOwnerRole);
  }
  
  /**
   * Get transfer history for a product
   * @param productId ID of the product
   */
  private async getTransferHistory(productId: string): Promise<any> {
    // Call transaction history contract to get transfer records
    return this.callContract(
      this.transactionHistoryContractId,
      'query',
      'getProductTransferHistory',
      { productId },
      null
    );
  }
  
  /**
   * Get current owner of a product
   * @param productId ID of the product
   */
  private async getCurrentOwner(productId: string): Promise<any> {
    const product = await this.readState<ProductData>(`product:${productId}`);
    
    if (!product) {
      return {
        success: false,
        message: `Product with ID ${productId} not found.`
      };
    }
    
    return {
      success: true,
      ownerId: product.ownerId
    };
  }
  
  /**
   * Call another contract
   * @param contractId Contract to call
   * @param callType Type of call (execute or query)
   * @param method Method to call
   * @param params Parameters for the method
   * @param sender Identity of the caller (null for queries)
   */
  private async callContract(
    contractId: string,
    callType: 'execute' | 'query',
    method: string,
    params: any,
    sender: string | null
  ): Promise<any> {
    const registry = ContractRegistry.getInstance();
    
    try {
      if (callType === 'execute' && sender) {
        return await registry.executeContract(contractId, method, params, sender);
      } else if (callType === 'query') {
        return await registry.queryContract(contractId, method, params);
      } else {
        throw new Error('Invalid contract call type or missing sender for execute');
      }
    } catch (error) {
      console.error(`Error calling contract ${contractId}.${method}:`, error);
      throw new Error(`Contract call to ${contractId}.${method} failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * Validate transfer based on the supply chain role hierarchy
   * @param currentOwnerRole Role of the current owner
   * @param newOwnerRole Role of the new owner
   */
  private validateRoleBasedTransfer(
    currentOwnerRole: UserRole,
    newOwnerRole: UserRole
  ): TransferResult {
    switch (currentOwnerRole) {
      case UserRole.FARMER:
        return this.validateFarmerTransfer(newOwnerRole);
      case UserRole.COLLECTOR:
        return this.validateCollectorTransfer(newOwnerRole);
      case UserRole.TRADER:
        return this.validateTraderTransfer(newOwnerRole);
      case UserRole.RETAILER:
        return this.validateRetailerTransfer(newOwnerRole);
      case UserRole.CONSUMER:
        return {
          success: false,
          message: "Consumers cannot transfer product ownership."
        };
      default:
        return {
          success: false,
          message: "Invalid owner role for transfer."
        };
    }
  }
  
  /**
   * Validate transfers from a Farmer
   * Farmers can only transfer to Collectors
   */
  private validateFarmerTransfer(newOwnerRole: UserRole): TransferResult {
    if (newOwnerRole !== UserRole.COLLECTOR) {
      return {
        success: false,
        message: "Farmers can only transfer products to Collectors."
      };
    }
    return { success: true };
  }
  
  /**
   * Validate transfers from a Collector
   * Collectors can only transfer to Traders
   */
  private validateCollectorTransfer(newOwnerRole: UserRole): TransferResult {
    if (newOwnerRole !== UserRole.TRADER) {
      return {
        success: false,
        message: "Collectors can only transfer products to Traders."
      };
    }
    return { success: true };
  }
  
  /**
   * Validate transfers from a Trader
   * Traders can only transfer to Retailers
   */
  private validateTraderTransfer(newOwnerRole: UserRole): TransferResult {
    if (newOwnerRole !== UserRole.RETAILER) {
      return {
        success: false,
        message: "Traders can only transfer products to Retailers."
      };
    }
    return { success: true };
  }
  
  /**
   * Validate transfers from a Retailer
   * Retailers can only transfer to Consumers
   */
  private validateRetailerTransfer(newOwnerRole: UserRole): TransferResult {
    if (newOwnerRole !== UserRole.CONSUMER) {
      return {
        success: false,
        message: "Retailers can only transfer products to Consumers."
      };
    }
    return { success: true };
  }
} 