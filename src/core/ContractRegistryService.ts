import { ContractRegistry } from '../contracts/ContractRegistry';
import { ProductManagementContract } from '../contracts/ProductManagementContract';
import { TransactionHistoryContract } from '../contracts/TransactionHistoryContract';
import { OwnershipTransferContract } from '../contracts/OwnershipTransferContract';
import { StockManagementContract } from '../contracts/StockManagementContract';
import { PaymentManagementContract } from '../contracts/PaymentManagementContract';
import { txhashDB } from "../helper/level.db.client";

/**
 * Service for managing smart contract initialization and access
 */
class ContractRegistryService {
  private static initialized = false;

  /**
   * Initialize all contracts in the registry
   */
  static async initializeContracts(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    try {
      const registry = ContractRegistry.getInstance();

      // Initialize all contracts
      const contracts = [
        new ProductManagementContract(txhashDB),
        new TransactionHistoryContract(txhashDB),
        new OwnershipTransferContract(txhashDB),
        new StockManagementContract(txhashDB),
        new PaymentManagementContract(txhashDB)
      ];

      // Deploy each contract
      for (const contract of contracts) {
        await registry.deployContract(contract);
      }

      this.initialized = true;
      console.log('All contracts initialized and deployed successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize contracts:', error);
      return false;
    }
  }

  /**
   * Execute a contract method
   * @param contractId ID of the contract to execute
   * @param method Method to call
   * @param params Parameters to pass to the method
   * @param sender Identity of the caller
   * @returns Result of the contract execution
   */
  static async executeContract(
    contractId: string,
    method: string,
    params: any,
    sender: string
  ): Promise<any> {
    await this.ensureInitialized();
    const registry = ContractRegistry.getInstance();
    return registry.executeContract(contractId, method, params, sender);
  }

  /**
   * Query a contract's state without modifying it
   * @param contractId ID of the contract to query
   * @param method Method to call
   * @param params Parameters to pass to the method
   * @returns Result of the contract query
   */
  static async queryContract(
    contractId: string,
    method: string,
    params: any
  ): Promise<any> {
    await this.ensureInitialized();
    const registry = ContractRegistry.getInstance();
    return registry.queryContract(contractId, method, params);
  }

  /**
   * Ensure contracts are initialized before use
   */
  private static async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const initialized = await this.initializeContracts();
      if (!initialized) {
        throw new Error('Failed to initialize contracts');
      }
    }
  }
}

export default ContractRegistryService; 