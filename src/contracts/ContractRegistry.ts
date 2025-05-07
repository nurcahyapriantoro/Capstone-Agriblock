import { ISmartContract } from './ISmartContract';
import { Level } from 'level';
import { txhashDB } from '../helper/level.db.client';

/**
 * Event subscription interface
 */
interface EventSubscription {
  contractId: string;
  eventName: string;
  callback: (eventData: any) => void;
}

/**
 * Registry for all smart contracts in the blockchain system
 * Handles deployment, upgrades, and access to contracts
 */
export class ContractRegistry {
  private static instance: ContractRegistry;
  private contracts: Map<string, ISmartContract> = new Map();
  private stateDB: Level<string, string>;
  private eventSubscriptions: Map<string, EventSubscription> = new Map();

  private constructor(stateDB: Level<string, string>) {
    this.stateDB = stateDB;
  }

  /**
   * Get the singleton instance of the contract registry
   */
  public static getInstance(): ContractRegistry {
    if (!ContractRegistry.instance) {
      ContractRegistry.instance = new ContractRegistry(txhashDB);
    }
    return ContractRegistry.instance;
  }

  /**
   * Deploy a new contract
   * @param contract The contract to deploy
   * @returns Success status
   */
  public async deployContract(contract: ISmartContract): Promise<boolean> {
    // Check if contract already exists
    if (this.contracts.has(contract.contractId)) {
      console.error(`Contract with ID ${contract.contractId} already exists`);
      return false;
    }

    // Initialize the contract
    const initialized = await contract.initialize();
    if (!initialized) {
      console.error(`Failed to initialize contract ${contract.contractId}`);
      return false;
    }

    // Store contract metadata in the state database
    await this.stateDB.put(`contract:${contract.contractId}:meta`, JSON.stringify({
      id: contract.contractId,
      name: contract.name,
      version: contract.version,
      deployed: Date.now()
    }));

    // Add to memory registry
    this.contracts.set(contract.contractId, contract);
    console.log(`Contract deployed: ${contract.name} (${contract.contractId}) v${contract.version}`);
    
    return true;
  }

  /**
   * Upgrade an existing contract to a new version
   * @param contractId ID of the contract to upgrade
   * @param newContract The new contract implementation
   * @returns Success status
   */
  public async upgradeContract(contractId: string, newContract: ISmartContract): Promise<boolean> {
    // Verify contracts match and it's actually an upgrade
    if (contractId !== newContract.contractId) {
      console.error("Contract ID mismatch during upgrade");
      return false;
    }

    const existing = this.contracts.get(contractId);
    if (!existing) {
      console.error(`Contract ${contractId} not found for upgrade`);
      return false;
    }

    // Initialize the new contract
    const initialized = await newContract.initialize();
    if (!initialized) {
      console.error(`Failed to initialize upgraded contract ${contractId}`);
      return false;
    }

    // Update contract metadata
    await this.stateDB.put(`contract:${contractId}:meta`, JSON.stringify({
      id: newContract.contractId,
      name: newContract.name,
      version: newContract.version,
      deployed: Date.now(),
      upgraded: Date.now()
    }));

    // Replace in memory registry
    this.contracts.set(contractId, newContract);
    console.log(`Contract upgraded: ${newContract.name} (${contractId}) to v${newContract.version}`);
    
    return true;
  }

  /**
   * Get a deployed contract by ID
   * @param contractId ID of the contract to retrieve
   * @returns The contract or null if not found
   */
  public getContract(contractId: string): ISmartContract | null {
    return this.contracts.get(contractId) || null;
  }

  /**
   * Execute a method on a contract
   * @param contractId ID of the contract to call
   * @param method Method to execute
   * @param params Parameters for the method
   * @param sender Identity of the caller
   * @returns Result of the execution
   */
  public async executeContract(
    contractId: string, 
    method: string, 
    params: any, 
    sender: string
  ): Promise<any> {
    const contract = this.getContract(contractId);
    if (!contract) {
      throw new Error(`Contract ${contractId} not found`);
    }
    
    return contract.execute(method, params, sender);
  }

  /**
   * Query a contract's state
   * @param contractId ID of the contract to query
   * @param method Method to query
   * @param params Parameters for the method
   * @returns Result of the query
   */
  public async queryContract(
    contractId: string, 
    method: string, 
    params: any
  ): Promise<any> {
    const contract = this.getContract(contractId);
    if (!contract) {
      throw new Error(`Contract ${contractId} not found`);
    }
    
    return contract.query(method, params);
  }

  /**
   * Get all deployed contracts
   * @returns List of contract IDs and metadata
   */
  public async listContracts(): Promise<Array<{id: string, name: string, version: string}>> {
    const contracts: Array<{id: string, name: string, version: string}> = [];
    
    for (const [id, contract] of this.contracts.entries()) {
      contracts.push({
        id,
        name: contract.name,
        version: contract.version
      });
    }
    
    return contracts;
  }

  /**
   * Subscribe to events emitted by contracts
   * @param contractId Contract ID to listen to
   * @param eventName Event name to subscribe to
   * @param callback Function to call when event is emitted
   * @returns Subscription ID for later unsubscribing
   */
  public subscribeToEvents(
    contractId: string, 
    eventName: string, 
    callback: (eventData: any) => void
  ): string {
    const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Store subscription
    this.eventSubscriptions.set(subscriptionId, { 
      contractId, 
      eventName, 
      callback 
    });
    
    console.log(`Event subscription created: ${contractId}:${eventName} (${subscriptionId})`);
    return subscriptionId;
  }

  /**
   * Unsubscribe from contract events
   * @param subscriptionId ID of the subscription to remove
   * @returns Success status
   */
  public unsubscribeFromEvents(subscriptionId: string): boolean {
    const removed = this.eventSubscriptions.delete(subscriptionId);
    if (removed) {
      console.log(`Event subscription removed: ${subscriptionId}`);
    }
    return removed;
  }

  /**
   * Notify all subscribers about an emitted event
   * This is called internally by the SmartContract base class
   * @param contractId ID of the contract emitting the event
   * @param eventName Name of the emitted event
   * @param eventData Data associated with the event
   */
  public notifyEventSubscribers(
    contractId: string,
    eventName: string,
    eventData: any
  ): void {
    // Find all matching subscriptions
    for (const [id, subscription] of this.eventSubscriptions.entries()) {
      if (
        subscription.contractId === contractId && 
        subscription.eventName === eventName
      ) {
        try {
          // Call the subscriber callback
          subscription.callback({
            ...eventData,
            contractId,
            eventName,
            timestamp: Date.now()
          });
        } catch (error) {
          console.error(`Error in event subscriber ${id}:`, error);
        }
      }
    }
  }

  /**
   * Upgrade existing contract with data migration
   * @param contractId ID of the contract to upgrade
   * @param newContract The new implementation
   * @param migrationFn Optional function to migrate data between versions
   * @returns Success status
   */
  public async upgradeContractWithMigration(
    contractId: string, 
    newContract: ISmartContract,
    migrationFn?: (oldState: any, newState: any) => Promise<void>
  ): Promise<boolean> {
    // Save old contract for migration
    const oldContract = this.getContract(contractId);
    if (!oldContract) {
      console.error(`Contract ${contractId} not found for upgrade`);
      return false;
    }
    
    // Determine versions
    const oldVersion = oldContract.version;
    const newVersion = newContract.version;
    
    // Perform standard upgrade
    const upgraded = await this.upgradeContract(contractId, newContract);
    if (!upgraded) return false;
    
    // If migration function exists, run it
    if (migrationFn) {
      try {
        await migrationFn(oldContract, newContract);
        console.log(`Migration completed from v${oldVersion} to v${newVersion}`);
      } catch (error) {
        console.error(`Migration failed: ${(error as Error).message}`);
        // Rollback
        this.contracts.set(contractId, oldContract);
        return false;
      }
    }
    
    return true;
  }
} 