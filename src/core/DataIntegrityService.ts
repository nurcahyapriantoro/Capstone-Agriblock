/**
 * Type definitions for integrity check results
 */
interface IntegrityResult {
  integrity: 'verified' | 'partial' | 'reconstructed' | 'failed';
  issues?: string[];
  details?: Record<string, any>;
}

import { blockDB, bhashDB, txhashDB, stateDB } from "../helper/level.db.client";
import { cryptoHashV2 } from "../crypto-hash";
import Transaction from "../transaction";
import Block from "../block";

/**
 * Service to verify and ensure data integrity of products in the blockchain
 */
class DataIntegrityService {
  private static instance: DataIntegrityService;

  // Private constructor for singleton pattern
  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): DataIntegrityService {
    if (!DataIntegrityService.instance) {
      DataIntegrityService.instance = new DataIntegrityService();
    }
    return DataIntegrityService.instance;
  }

  /**
   * Verify the integrity of a product's data
   * @param productId ID of the product to verify
   */
  async verifyProductIntegrity(productId: string): Promise<IntegrityResult> {
    console.log(`Performing integrity verification for product ${productId}`);
    
    try {
      // 1. Get all transaction hashes related to this product
      const productTransactions = await this.getProductTransactions(productId);
      
      if (productTransactions.length === 0) {
        return {
          integrity: 'failed',
          issues: [`No blockchain transactions found for product ${productId}`],
          details: {
            lastChecked: new Date().toISOString(),
            checkedBy: 'system',
            productId
          }
        };
      }
      
      // 2. Verify each transaction on the blockchain
      const verificationResults = await Promise.all(
        productTransactions.map(txHash => this.verifyTransaction(txHash))
      );
      
      // 3. Calculate the overall integrity status
      const issues = verificationResults
        .filter(result => !result.valid)
        .map(result => result.issue as string);
      
      // 4. Determine integrity level based on results
      let integrityStatus: 'verified' | 'partial' | 'reconstructed' | 'failed' = 'verified';
      
      if (issues.length > 0) {
        if (issues.length === verificationResults.length) {
          integrityStatus = 'failed';
        } else if (issues.length > verificationResults.length / 2) {
          integrityStatus = 'reconstructed';
        } else {
          integrityStatus = 'partial';
        }
      }
      
      // 5. Return the final result
      return {
        integrity: integrityStatus,
        issues: issues.length > 0 ? issues : undefined,
        details: {
          lastChecked: new Date().toISOString(),
          checkedBy: 'system',
          productId,
          transactionsChecked: verificationResults.length,
          validTransactions: verificationResults.filter(r => r.valid).length
        }
      };
    } catch (error) {
      console.error(`Error verifying product integrity for ${productId}:`, error);
      return {
        integrity: 'failed',
        issues: [`Error during verification: ${error instanceof Error ? error.message : String(error)}`],
        details: {
          lastChecked: new Date().toISOString(),
          checkedBy: 'system',
          productId,
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Log the result of an integrity check to the blockchain or database
   * @param productId ID of the product that was checked
   * @param result Result of the integrity check
   */
  async logIntegrityCheck(productId: string, result: IntegrityResult): Promise<void> {
    console.log(`Logging integrity check for product ${productId}: ${result.integrity}`);
    
    try {
      // Create a log entry with timestamp
      const logEntry = {
        timestamp: Date.now(),
        productId,
        result
      };
      
      // Store in state database with a timestamp-based key for chronological order
      const logKey = `integrity_check:${productId}:${Date.now()}`;
      await stateDB.put(logKey, JSON.stringify(logEntry));
      
      // Update the latest integrity status for quick access
      const statusKey = `integrity_status:${productId}`;
      await stateDB.put(statusKey, JSON.stringify({
        lastChecked: Date.now(),
        status: result.integrity,
        issues: result.issues
      }));
      
    } catch (error) {
      console.error(`Failed to log integrity check for product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Attempt to recover product data if integrity verification partially failed
   * @param productId ID of the product to recover
   */
  async recoverProductData(productId: string): Promise<{ success: boolean; recoveredData?: any; message: string }> {
    console.log(`Attempting to recover data for product ${productId}`);
    
    try {
      // 1. Get all transactions for this product
      const productTransactions = await this.getProductTransactions(productId);
      
      if (productTransactions.length === 0) {
        return {
          success: false,
          message: `No transactions found for product ${productId}`
        };
      }
      
      // 2. Get valid transactions
      const transactionResults = await Promise.all(
        productTransactions.map(txHash => this.getTransactionData(txHash))
      );
      
      // Filter out null values and explicitly cast to non-null type
      const validTransactions = transactionResults.filter((tx): tx is { data: any; timestamp: number } => tx !== null);
      
      if (validTransactions.length === 0) {
        return {
          success: false, 
          message: 'No valid transactions found for recovery'
        };
      }
      
      // 3. Reconstruct product data from valid transactions
      // Sort by timestamp to get the latest valid state (they're now guaranteed non-null)
      validTransactions.sort((a, b) => a.timestamp - b.timestamp);
      
      // The most recent valid transaction represents the latest state
      const latestValidTransaction = validTransactions[validTransactions.length - 1];
      
      return {
        success: true,
        recoveredData: latestValidTransaction.data,
        message: `Successfully recovered product data from ${validTransactions.length} valid transactions`
      };
    } catch (error) {
      console.error(`Error recovering product data for ${productId}:`, error);
      return {
        success: false,
        message: `Data recovery failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Fix data integrity issues if possible
   * @param productId ID of the product to fix
   */
  async fixIntegrityIssues(productId: string): Promise<{ success: boolean; message: string }> {
    console.log(`Attempting to fix integrity issues for product ${productId}`);
    
    try {
      // 1. Check current integrity status
      const integrityResult = await this.verifyProductIntegrity(productId);
      
      if (integrityResult.integrity === 'verified') {
        return {
          success: true,
          message: 'Product data already has verified integrity, no fixes needed'
        };
      }
      
      if (integrityResult.integrity === 'failed') {
        return {
          success: false,
          message: 'Product data integrity completely failed, manual recovery required'
        };
      }
      
      // 2. Attempt data recovery for partial or reconstructed integrity
      const recoveryResult = await this.recoverProductData(productId);
      
      if (!recoveryResult.success) {
        return {
          success: false,
          message: `Could not fix integrity issues: ${recoveryResult.message}`
        };
      }
      
      // 3. Store the recovered data (in a real implementation, this would update the product state)
      const productStateKey = `product:${productId}`;
      
      try {
        // Get existing product data
        const existingProductData = await stateDB.get(productStateKey)
          .then(data => JSON.parse(data))
          .catch(() => null);
        
        if (existingProductData) {
          // Merge recovered data with existing data
          const updatedData = {
            ...existingProductData,
            ...recoveryResult.recoveredData,
            _integrityFixed: true,
            _integrityFixedAt: Date.now()
          };
          
          await stateDB.put(productStateKey, JSON.stringify(updatedData));
          
          return {
            success: true,
            message: 'Successfully fixed product data integrity issues'
          };
        } else {
          // Create new product data entry
          await stateDB.put(productStateKey, JSON.stringify({
            ...recoveryResult.recoveredData,
            _integrityFixed: true,
            _integrityFixedAt: Date.now()
          }));
          
          return {
            success: true,
            message: 'Successfully restored product data'
          };
        }
      } catch (error) {
        return {
          success: false,
          message: `Failed to update product data: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    } catch (error) {
      console.error(`Error fixing integrity issues for ${productId}:`, error);
      return {
        success: false,
        message: `Integrity fix failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get all transaction hashes related to a specific product
   * @param productId ID of the product
   * @returns Array of transaction hashes
   */
  private async getProductTransactions(productId: string): Promise<string[]> {
    try {
      // Search for all product transaction references using pattern matching on keys
      const allKeys = await txhashDB.keys().all();
      const productTxKeys = allKeys.filter(key => 
        key.startsWith(`product:${productId}:transaction:`) || 
        key.includes(`:${productId}:`)
      );
      
      // Extract transaction hashes from the keys or their values
      const txHashes: string[] = [];
      
      for (const key of productTxKeys) {
        const value = await txhashDB.get(key);
        try {
          const parsed = JSON.parse(value);
          if (parsed && parsed.transactionId) {
            txHashes.push(parsed.transactionId);
          }
        } catch {
          // If not JSON or doesn't have transactionId, check if the value itself is a transaction hash
          if (typeof value === 'string' && value.length > 16) {
            txHashes.push(value);
          }
        }
      }
      
      // Also check state database for product-related transaction references
      try {
        const stateKeys = await stateDB.keys().all();
        const productStateKeys = stateKeys.filter(key => 
          key.startsWith(`product:${productId}`) || 
          key.includes(`:${productId}:`)
        );
        
        for (const key of productStateKeys) {
          const value = await stateDB.get(key);
          try {
            const parsed = JSON.parse(value);
            if (parsed && Array.isArray(parsed.outgoingTransactions)) {
              txHashes.push(...parsed.outgoingTransactions);
            }
            if (parsed && Array.isArray(parsed.incomingTransactions)) {
              txHashes.push(...parsed.incomingTransactions);
            }
          } catch {
            // Skip non-JSON values
          }
        }
      } catch (error) {
        console.warn(`Error fetching state transactions for ${productId}:`, error);
      }
      
      // Remove duplicates and return
      return [...new Set(txHashes)];
    } catch (error) {
      console.error(`Error getting transactions for product ${productId}:`, error);
      return [];
    }
  }

  /**
   * Verify a transaction's integrity on the blockchain
   * @param txHash Hash of the transaction to verify
   * @returns Result of the verification
   */
  private async verifyTransaction(txHash: string): Promise<{ valid: boolean; issue?: string }> {
    try {
      // 1. Get transaction location (block number and index)
      const txLocation = await txhashDB.get(txHash)
        .catch(() => null);
      
      if (!txLocation) {
        return { valid: false, issue: `Transaction ${txHash} not found in the blockchain` };
      }
      
      // 2. Parse location (format: "blockNumber txIndex")
      const [blockNumber, txIndex] = txLocation.split(' ').map(Number);
      
      // 3. Get the block containing this transaction
      const blockData = await blockDB.get(blockNumber.toString())
        .then(data => JSON.parse(data))
        .catch(() => null);
      
      if (!blockData) {
        return { valid: false, issue: `Block ${blockNumber} containing transaction ${txHash} not found` };
      }
      
      // 4. Get the transaction from the block
      const transaction = blockData.data[txIndex];
      
      if (!transaction) {
        return { valid: false, issue: `Transaction index ${txIndex} not found in block ${blockNumber}` };
      }
      
      // 5. Recreate the transaction to verify its hash
      const recreatedTx = new Transaction({
        from: transaction.from,
        to: transaction.to,
        data: transaction.data,
        lastTransactionHash: transaction.lastTransactionHash,
        signature: transaction.signature
      });
      
      // 6. Verify the transaction hash
      const computedHash = recreatedTx.getHash();
      const hashMatches = computedHash === txHash;
      
      if (!hashMatches) {
        return { valid: false, issue: `Transaction hash mismatch: stored ${txHash}, computed ${computedHash}` };
      }
      
      // 7. Verify transaction signature
      const signatureValid = recreatedTx.isValid();
      
      if (!signatureValid) {
        return { valid: false, issue: `Transaction signature verification failed` };
      }
      
      return { valid: true };
    } catch (error) {
      console.error(`Error verifying transaction ${txHash}:`, error);
      return { 
        valid: false, 
        issue: `Verification error: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * Get transaction data from the blockchain
   * @param txHash Hash of the transaction
   * @returns Transaction data or null if not found/invalid
   */
  private async getTransactionData(txHash: string): Promise<{ data: any; timestamp: number } | null> {
    try {
      // 1. Get transaction location (block number and index)
      const txLocation = await txhashDB.get(txHash).catch(() => null);
      if (!txLocation) return null;
      
      // 2. Parse location
      const [blockNumber, txIndex] = txLocation.split(' ').map(Number);
      
      // 3. Get the block
      const blockData = await blockDB.get(blockNumber.toString())
        .then(data => JSON.parse(data))
        .catch(() => null);
      
      if (!blockData) return null;
      
      // 4. Get transaction and timestamp
      const transaction = blockData.data[txIndex];
      if (!transaction) return null;
      
      return {
        data: transaction.data,
        timestamp: blockData.timestamp
      };
    } catch (error) {
      console.error(`Error getting transaction data for ${txHash}:`, error);
      return null;
    }
  }
}

// Export the class as default
export default DataIntegrityService;