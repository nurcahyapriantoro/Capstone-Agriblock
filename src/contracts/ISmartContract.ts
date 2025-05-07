import { Level } from "level";
import { ContractRegistry } from "./ContractRegistry";

/**
 * Base interface for all smart contracts
 */
export interface ISmartContract {
  /**
   * Unique identifier for the contract
   */
  contractId: string;
  
  /**
   * Contract name - used for identification and reference
   */
  name: string;
  
  /**
   * Contract version for upgrades tracking
   */
  version: string;
  
  /**
   * The state database where the contract stores its state
   */
  stateDB: Level<string, string>;
  
  /**
   * Initialize the contract with its state
   */
  initialize(): Promise<boolean>;
  
  /**
   * Execute a method of the contract
   * @param method Method name to call
   * @param params Parameters for the method
   * @param sender Identity of the caller (public key)
   */
  execute(method: string, params: any, sender: string): Promise<any>;
  
  /**
   * Query the contract state without modifying it
   * @param method Method name to call
   * @param params Parameters for the method
   */
  query(method: string, params: any): Promise<any>;
  
  /**
   * Get the contract's state JSON schema
   */
  getStateSchema(): Record<string, any>;
}

/**
 * Activity log level
 */
export enum LogLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  DEBUG = 'debug'
}

/**
 * Base class for all smart contracts in the AgriChain system
 * This provides the common structure and functionality for our contracts
 */
export abstract class SmartContract implements ISmartContract {
  private _stateDB: Level<string, string>;
  private _contractId: string;
  private _contractName: string;
  private _contractVersion: string;
  
  constructor(
    contractId: string,
    contractName: string,
    contractVersion: string,
    stateDB: Level<string, string>
  ) {
    this._contractId = contractId;
    this._contractName = contractName;
    this._contractVersion = contractVersion;
    this._stateDB = stateDB;
  }
  
  // Getter untuk state database
  get stateDB(): Level<string, string> {
    return this._stateDB;
  }
  
  // Getter untuk kontrak ID
  get contractId(): string {
    return this._contractId;
  }
  
  // Getter untuk nama kontrak
  get name(): string {
    return this._contractName;
  }
  
  // Getter untuk versi kontrak
  get version(): string {
    return this._contractVersion;
  }
  
  /**
   * Initialize the contract with required setup
   */
  public abstract initialize(): Promise<boolean>;
  
  /**
   * Execute a contract method (state-changing operation)
   * @param method Method to execute
   * @param params Method parameters
   * @param sender Identity of the caller
   */
  public abstract execute(method: string, params: any, sender: string): Promise<any>;
  
  /**
   * Query contract state (read-only operation)
   * @param method Method to query
   * @param params Method parameters
   */
  public abstract query(method: string, params: any): Promise<any>;
  
  /**
   * Get metadata about this contract
   */
  public getContractInfo(): { contractId: string; name: string; version: string } {
    return {
      contractId: this.contractId,
      name: this.name,
      version: this.version,
    };
  }
  
  /**
   * Get schema for this contract's state
   * (should be overridden by implementing contracts)
   */
  public getStateSchema(): Record<string, any> {
    return {};
  }
  
  /**
   * Verify if a sender is authorized to call a particular method
   * (should be overridden by implementing contracts with role validation)
   * 
   * @param sender The sender's identity
   * @param method The method being called
   */
  protected async verifySender(sender: string, method: string): Promise<boolean> {
    // Default implementation allows all calls - override in subclasses
    return true;
  }
  
  /**
   * Write state to the contract's database
   * @param key State key
   * @param value State value
   */
  protected async writeState<T>(key: string, value: T): Promise<void> {
    try {
      await this.stateDB.put(
        `${this.contractId}:${key}`,
        JSON.stringify(value)
      );
    } catch (error) {
      console.error(`Error writing state for key ${key}:`, error);
      throw new Error(`Failed to write state: ${(error as Error).message}`);
    }
  }
  
  /**
   * Read state from the contract's database
   * @param key State key
   * @returns State value or null if not found
   */
  protected async readState<T>(key: string): Promise<T | null> {
    try {
      const value = await this.stateDB.get(`${this.contractId}:${key}`);
      return JSON.parse(value) as T;
    } catch (error: any) {
      if (error.code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      console.error(`Error reading state for key ${key}:`, error);
      throw new Error(`Failed to read state: ${error.message}`);
    }
  }
  
  /**
   * Delete state from the contract's database
   * @param key State key
   */
  protected async deleteState(key: string): Promise<void> {
    try {
      await this.stateDB.del(`${this.contractId}:${key}`);
    } catch (error) {
      console.error(`Error deleting state for key ${key}:`, error);
      throw new Error(`Failed to delete state: ${(error as Error).message}`);
    }
  }
  
  /**
   * Emit an event from this contract
   * @param eventName Name of the event
   * @param eventData Event data
   */
  protected async emitEvent(eventName: string, eventData: any): Promise<void> {
    const event = {
      contractId: this.contractId,
      contractName: this.name,
      eventName,
      eventData,
      timestamp: Date.now(),
    };
    
    // Log the event
    console.log('EVENT EMITTED:', JSON.stringify(event, null, 2));
    
    // Store event in state database for history
    const eventId = `event:${this.contractId}:${eventName}:${Date.now()}`;
    await this.stateDB.put(eventId, JSON.stringify(event));
    
    // Notify subscribers through ContractRegistry
    const registry = ContractRegistry.getInstance();
    registry.notifyEventSubscribers(this.contractId, eventName, eventData);
  }

  /**
   * Log activity in the contract with detailed information
   * @param action The action being performed
   * @param details Additional details about the action
   * @param level Log level (info, warning, error, debug)
   */
  protected async logActivity(
    action: string,
    details: Record<string, any>,
    level: LogLevel = LogLevel.INFO
  ): Promise<void> {
    const logEntry = {
      contractId: this.contractId,
      contractName: this.name,
      timestamp: Date.now(),
      action,
      details,
      level
    };
    
    // Store log in database
    const logId = `log:${this.contractId}:${Date.now()}`;
    await this.stateDB.put(logId, JSON.stringify(logEntry));
    
    // Format console output based on level
    let logPrefix = '';
    switch (level) {
      case LogLevel.ERROR:
        logPrefix = '\x1b[31mERROR\x1b[0m';
        break;
      case LogLevel.WARNING:
        logPrefix = '\x1b[33mWARN\x1b[0m';
        break;
      case LogLevel.DEBUG:
        logPrefix = '\x1b[36mDEBUG\x1b[0m';
        break;
      default:
        logPrefix = '\x1b[32mINFO\x1b[0m';
    }
    
    console.log(
      `${logPrefix} [${this.name}] ${action}: ${JSON.stringify(details)}`
    );
    
    // For errors and warnings, also emit events
    if (level === LogLevel.ERROR || level === LogLevel.WARNING) {
      await this.emitEvent(`Log${level.charAt(0).toUpperCase() + level.slice(1)}`, {
        action,
        ...details
      });
    }
  }
} 