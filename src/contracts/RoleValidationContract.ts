import { SmartContract } from './ISmartContract';
import { Level } from 'level';
import { UserRole, TransactionAction } from '../enum';

/**
 * User data stored in the RoleValidation contract
 */
interface UserData {
  userId: string;
  role: UserRole;
  metadata: Record<string, any>;
  registeredAt: number;
  lastUpdated: number;
  isActive: boolean;
}

/**
 * Result of a role validation operation
 */
interface ValidationResult {
  success: boolean;
  message?: string;
  role?: UserRole;
  isValid?: boolean;
}

/**
 * Smart contract for role validation and management
 * Controls user roles and permissions in the supply chain
 */
export class RoleValidationContract extends SmartContract {
  // Admin roles that can manage other users
  private static ADMIN_ROLES = [UserRole.FARMER];
  
  constructor(stateDB: Level<string, string>) {
    super(
      'role-validation-v1',
      'RoleValidation',
      '1.0.0',
      stateDB
    );
  }
  
  /**
   * Initialize the contract
   */
  public async initialize(): Promise<boolean> {
    try {
      // Initialize admin user if not already exists
      const adminUser = await this.readState<UserData>('admin');
      if (!adminUser) {
        await this.writeState<UserData>('admin', {
          userId: 'admin',
          role: UserRole.FARMER,
          metadata: { isSystemAdmin: true },
          registeredAt: Date.now(),
          lastUpdated: Date.now(),
          isActive: true
        });
        
        await this.emitEvent('AdminCreated', { timestamp: Date.now() });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to initialize RoleValidation contract:', error);
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
      case 'registerUser':
        return this.registerUser(params.userId, params.role, params.metadata, sender);
      case 'updateUserRole':
        return this.updateUserRole(params.userId, params.newRole, sender);
      case 'deactivateUser':
        return this.deactivateUser(params.userId, sender);
      case 'reactivateUser':
        return this.reactivateUser(params.userId, sender);
      case 'validateTransaction':
        return this.validateTransaction(params.fromUserId, params.toUserId, params.action);
      case 'validateUserAction':
        return this.validateUserAction(params.userId, params.action);
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
      case 'getUserRole':
        return this.getUserRole(params.userId);
      case 'validateAccess':
        return this.validateAccess(params.userId, params.requiredRole);
      case 'isActive':
        return this.isUserActive(params.userId);
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
        users: {
          type: 'object',
          patternProperties: {
            '^.*$': {
              type: 'object',
              properties: {
                userId: { type: 'string' },
                role: { type: 'string', enum: Object.values(UserRole) },
                metadata: { type: 'object' },
                registeredAt: { type: 'number' },
                lastUpdated: { type: 'number' },
                isActive: { type: 'boolean' }
              },
              required: ['userId', 'role', 'registeredAt', 'isActive']
            }
          }
        }
      }
    };
  }
  
  /**
   * Verify sender is authorized for the operation
   * @param sender Identity of the caller
   * @param method Method being called
   */
  protected async verifySender(sender: string, method: string): Promise<boolean> {
    // Admin methods can only be called by admins
    const adminMethods = ['updateUserRole', 'deactivateUser', 'reactivateUser'];
    if (adminMethods.includes(method)) {
      const senderData = await this.readState<UserData>(sender);
      if (!senderData) return false;
      
      return RoleValidationContract.ADMIN_ROLES.includes(senderData.role) && senderData.isActive;
    }
    
    // Anyone can call other methods
    return true;
  }
  
  /**
   * Register a new user with a role
   * @param userId User ID to register
   * @param role Role to assign
   * @param metadata Additional user metadata
   * @param registrar Identity of user performing registration
   */
  private async registerUser(
    userId: string, 
    role: UserRole,
    metadata: Record<string, any> = {},
    registrar: string
  ): Promise<ValidationResult> {
    // Check if user already exists
    const existingUser = await this.readState<UserData>(userId);
    if (existingUser) {
      return {
        success: false,
        message: `User ${userId} already exists with role ${existingUser.role}`
      };
    }
    
    // Only admins can register admin users
    if (role === UserRole.FARMER) {
      const registrarData = await this.readState<UserData>(registrar);
      if (!registrarData || !RoleValidationContract.ADMIN_ROLES.includes(registrarData.role)) {
        return {
          success: false,
          message: `Only admins can register new admin users`
        };
      }
    }
    
    // Create new user
    const userData: UserData = {
      userId,
      role,
      metadata,
      registeredAt: Date.now(),
      lastUpdated: Date.now(),
      isActive: true
    };
    
    await this.writeState<UserData>(userId, userData);
    
    // Emit event for the registration
    await this.emitEvent('UserRegistered', {
      userId,
      role,
      registrar,
      timestamp: userData.registeredAt
    });
    
    return {
      success: true,
      message: `User ${userId} registered with role ${role}`,
      role
    };
  }
  
  /**
   * Update a user's role
   * @param userId User ID to update
   * @param newRole New role to assign
   * @param updater Identity of user performing the update
   */
  private async updateUserRole(
    userId: string,
    newRole: UserRole,
    updater: string
  ): Promise<ValidationResult> {
    // Get user data
    const userData = await this.readState<UserData>(userId);
    if (!userData) {
      return {
        success: false,
        message: `User ${userId} not found`
      };
    }
    
    // Update role
    userData.role = newRole;
    userData.lastUpdated = Date.now();
    
    await this.writeState<UserData>(userId, userData);
    
    // Emit event for the update
    await this.emitEvent('UserRoleUpdated', {
      userId,
      newRole,
      updater,
      timestamp: userData.lastUpdated
    });
    
    return {
      success: true,
      message: `User ${userId} role updated to ${newRole}`,
      role: newRole
    };
  }
  
  /**
   * Deactivate a user
   * @param userId User ID to deactivate
   * @param deactivator Identity of user performing the deactivation
   */
  private async deactivateUser(
    userId: string,
    deactivator: string
  ): Promise<ValidationResult> {
    // Get user data
    const userData = await this.readState<UserData>(userId);
    if (!userData) {
      return {
        success: false,
        message: `User ${userId} not found`
      };
    }
    
    // Update active status
    userData.isActive = false;
    userData.lastUpdated = Date.now();
    
    await this.writeState<UserData>(userId, userData);
    
    // Emit event for the deactivation
    await this.emitEvent('UserDeactivated', {
      userId,
      deactivator,
      timestamp: userData.lastUpdated
    });
    
    return {
      success: true,
      message: `User ${userId} deactivated`
    };
  }
  
  /**
   * Reactivate a user
   * @param userId User ID to reactivate
   * @param reactivator Identity of user performing the reactivation
   */
  private async reactivateUser(
    userId: string,
    reactivator: string
  ): Promise<ValidationResult> {
    // Get user data
    const userData = await this.readState<UserData>(userId);
    if (!userData) {
      return {
        success: false,
        message: `User ${userId} not found`
      };
    }
    
    // Update active status
    userData.isActive = true;
    userData.lastUpdated = Date.now();
    
    await this.writeState<UserData>(userId, userData);
    
    // Emit event for the reactivation
    await this.emitEvent('UserReactivated', {
      userId,
      reactivator,
      timestamp: userData.lastUpdated
    });
    
    return {
      success: true,
      message: `User ${userId} reactivated`
    };
  }
  
  /**
   * Get a user's role
   * @param userId User ID to lookup
   */
  private async getUserRole(userId: string): Promise<ValidationResult> {
    const userData = await this.readState<UserData>(userId);
    
    if (!userData) {
      return {
        success: false,
        message: `User ${userId} not found`
      };
    }
    
    return {
      success: true,
      role: userData.role
    };
  }
  
  /**
   * Validate if a user has the required role
   * @param userId User ID to validate
   * @param requiredRole Required role for access
   */
  private async validateAccess(
    userId: string,
    requiredRole: UserRole
  ): Promise<ValidationResult> {
    const userData = await this.readState<UserData>(userId);
    
    if (!userData) {
      return {
        success: false,
        message: `User ${userId} not found`
      };
    }
    
    if (!userData.isActive) {
      return {
        success: false,
        message: `User ${userId} is not active`
      };
    }
    
    if (userData.role !== requiredRole) {
      return {
        success: false,
        message: `User ${userId} has role ${userData.role}, required ${requiredRole}`
      };
    }
    
    return {
      success: true,
      role: userData.role
    };
  }
  
  /**
   * Check if a user is active
   * @param userId User ID to check
   */
  private async isUserActive(userId: string): Promise<ValidationResult> {
    const userData = await this.readState<UserData>(userId);
    
    if (!userData) {
      return {
        success: false,
        message: `User ${userId} not found`
      };
    }
    
    return {
      success: userData.isActive,
      message: userData.isActive ? 'User is active' : 'User is deactivated',
      role: userData.role
    };
  }

  /**
   * Validate if a user can perform a specific action
   * @param userId User ID to validate
   * @param action Transaction action to validate
   */
  private async validateUserAction(
    userId: string,
    action: TransactionAction
  ): Promise<ValidationResult> {
    const userData = await this.readState<UserData>(userId);
    
    if (!userData) {
      return {
        success: false,
        isValid: false,
        message: `User ${userId} not found`
      };
    }
    
    if (!userData.isActive) {
      return {
        success: false,
        isValid: false,
        message: `User ${userId} is not active`
      };
    }
    
    const isValid = this.isActionAllowedForRole(userData.role, action);
    
    return {
      success: true,
      isValid,
      message: isValid 
        ? `User is authorized to perform this action` 
        : `User with role ${userData.role} is not authorized to perform ${action}`
    };
  }
  
  /**
   * Validate transaction between two users based on their roles
   * @param fromUserId Sender user ID
   * @param toUserId Receiver user ID
   * @param action Transaction action
   */
  private async validateTransaction(
    fromUserId: string,
    toUserId: string,
    action: TransactionAction
  ): Promise<ValidationResult> {
    // Get both users' roles
    const fromUserResult = await this.getUserRole(fromUserId);
    const toUserResult = await this.getUserRole(toUserId);
    
    if (!fromUserResult.success) {
      return {
        success: false,
        isValid: false,
        message: `Sender user ${fromUserId} not found`
      };
    }
    
    if (!toUserResult.success) {
      return {
        success: false,
        isValid: false,
        message: `Receiver user ${toUserId} not found`
      };
    }
    
    // First check if the action is valid for the sender's role
    const actionValidation = await this.validateUserAction(fromUserId, action);
    if (!actionValidation.isValid) {
      return actionValidation;
    }
    
    // Now check if the transaction parties are valid for this action
    const fromRole = fromUserResult.role as UserRole;
    const toRole = toUserResult.role as UserRole;
    
    // Check transaction validity based on role relationships
    let isValid = false;
    let message = "";
    
    if (action === TransactionAction.SELL_PRODUCT) {
      // Validate seller to buyer relationship
      isValid = this.isValidSellerBuyerRelationship(fromRole, toRole);
      message = isValid 
        ? `Transaction is valid based on user roles` 
        : `Users with roles ${fromRole} and ${toRole} cannot perform ${action} transaction`;
    } else if (action === TransactionAction.BUY_PRODUCT) {
      // For buy, the relationship is reversed
      isValid = this.isValidSellerBuyerRelationship(toRole, fromRole);
      message = isValid 
        ? `Transaction is valid based on user roles` 
        : `Users with roles ${fromRole} and ${toRole} cannot perform ${action} transaction`;
    } else {
      // For other actions like VIEW_HISTORY, we already validated the sender can do it
      isValid = true;
      message = `Transaction is valid based on user roles`;
    }
    
    return {
      success: true,
      isValid,
      message
    };
  }
  
  /**
   * Check if an action is allowed for a specific role
   */
  private isActionAllowedForRole(role: UserRole, action: TransactionAction): boolean {
    switch (role) {
      case UserRole.FARMER:
        // Farmers dapat melakukan apa saja (pengganti admin)
        return true;
        
      case UserRole.COLLECTOR:
        return [
          TransactionAction.BUY_PRODUCT,
          TransactionAction.SELL_PRODUCT,
          TransactionAction.VIEW_HISTORY
        ].includes(action);
        
      case UserRole.TRADER:
        return [
          TransactionAction.BUY_PRODUCT,
          TransactionAction.SELL_PRODUCT,
          TransactionAction.VIEW_HISTORY
        ].includes(action);
        
      case UserRole.RETAILER:
        return [
          TransactionAction.BUY_PRODUCT,
          TransactionAction.VIEW_HISTORY
        ].includes(action);
        
      case UserRole.CONSUMER:
        return [
          TransactionAction.VIEW_HISTORY
        ].includes(action);
        
      default:
        return false;
    }
  }
  
  /**
   * Check if seller and buyer roles can transact
   */
  private isValidSellerBuyerRelationship(sellerRole: UserRole, buyerRole: UserRole): boolean {
    // Valid supply chain relationships
    if (sellerRole === UserRole.FARMER && buyerRole === UserRole.COLLECTOR) {
      return true;
    }
    if (sellerRole === UserRole.COLLECTOR && buyerRole === UserRole.TRADER) {
      return true;
    }
    if (sellerRole === UserRole.TRADER && buyerRole === UserRole.RETAILER) {
      return true;
    }
    
    // Farmers (sebagai pengganti admin) dapat bertransaksi dengan siapa saja
    if (sellerRole === UserRole.FARMER || buyerRole === UserRole.FARMER) {
      return true;
    }
    
    return false;
  }
}