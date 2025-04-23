import { Level } from "level";

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
 * Base class for all smart contracts in the AgriChain system
 * This provides the common structure and functionality for our contracts
 */
export abstract class SmartContract implements ISmartContract {
  private stateDB: Level<string, string>;
  private contractId: string;
  private contractName: string;
  private contractVersion: string;
  
  constructor(
    contractId: string,
    contractName: string,
    contractVersion: string,
    stateDB: Level<string, string>
  ) {
    this.contractId = contractId;
    this.contractName = contractName;
    this.contractVersion = contractVersion;
    this.stateDB = stateDB;
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
      name: this.contractName,
      version: this.contractVersion,
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
      contractName: this.contractName,
      eventName,
      eventData,
      timestamp: Date.now(),
    };
    
    // In a production blockchain, this would be stored in an events database
    // or propagated to listeners. For now we'll just log it.
    console.log('EVENT EMITTED:', JSON.stringify(event, null, 2));
  }
} 