import ProductService from "../core/ProductService";
import { UserRole } from "../enum";
import { txhashDB } from "../helper/level.db.client";
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface for batch operation result
 */
interface BatchOperationResult {
  success: boolean;
  totalItems: number;
  successCount: number;
  failedCount: number;
  errors: Array<{
    index: number;
    item: any;
    error: string;
  }>;
  successItems: Array<{
    index: number;
    id: string;
    item: any;
  }>;
  batchId: string;
}

/**
 * Interface for batch job status
 */
interface BatchJobStatus {
  batchId: string;
  operation: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalItems: number;
  completedItems: number;
  result?: BatchOperationResult;
  createdAt: number;
  updatedAt: number;
  userId: string;
}

/**
 * Service for performing batch operations on products
 */
class BatchOperationsService {
  private static BATCH_JOB_KEY_PREFIX = "batch_job:";
  
  /**
   * Create multiple products in a batch operation
   * @param farmerId ID of the farmer creating the products
   * @param products Array of product data to create
   * @param jobOptions Optional batch job options
   * @returns Result of the batch operation
   */
  static async createProducts(
    farmerId: string,
    products: Array<Omit<any, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>,
    jobOptions: { userId: string, runAsync?: boolean } = { userId: farmerId, runAsync: false }
  ): Promise<BatchOperationResult | string> {
    // Generate a batch ID for this operation
    const batchId = uuidv4();
    
    // If async, create a job and return the batch ID
    if (jobOptions.runAsync) {
      await this.createBatchJob(batchId, 'product_creation', products.length, jobOptions.userId);
      
      // Start processing in the background
      this.processProductCreationJob(batchId, farmerId, products, jobOptions.userId).catch(error => {
        console.error(`Error processing batch job ${batchId}:`, error);
      });
      
      return batchId;
    }
    
    // Otherwise, process synchronously
    return await this.processProductCreation(batchId, farmerId, products);
  }
  
  /**
   * Get the status of a batch job
   * @param batchId ID of the batch job
   * @returns Batch job status or null if not found
   */
  static async getBatchJobStatus(batchId: string): Promise<BatchJobStatus | null> {
    try {
      const key = this.BATCH_JOB_KEY_PREFIX + batchId;
      const data = await txhashDB.get(key);
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error getting batch job status for ${batchId}:`, error);
      return null;
    }
  }
  
  /**
   * Get all batch jobs for a user
   * @param userId ID of the user
   * @returns Array of batch jobs
   */
  static async getUserBatchJobs(userId: string): Promise<BatchJobStatus[]> {
    try {
      // Get all batch job keys
      const allKeys = await txhashDB.keys().all();
      const batchJobKeys = allKeys.filter(key => 
        key.toString().startsWith(this.BATCH_JOB_KEY_PREFIX)
      );
      
      // Get all batch job data
      const jobPromises = batchJobKeys.map(key => 
        txhashDB.get(key).then(data => JSON.parse(data))
      );
      
      const allJobs = await Promise.all(jobPromises);
      
      // Filter jobs by user ID
      return allJobs.filter(job => job.userId === userId);
    } catch (error) {
      console.error(`Error getting batch jobs for user ${userId}:`, error);
      return [];
    }
  }
  
  /**
   * Update multiple products in a batch operation
   * @param products Array of product updates with IDs
   * @param jobOptions Optional batch job options
   * @returns Result of the batch operation
   */
  static async updateProducts(
    products: Array<{ id: string, updates: any }>,
    jobOptions: { userId: string, runAsync?: boolean }
  ): Promise<BatchOperationResult | string> {
    // Generate a batch ID for this operation
    const batchId = uuidv4();
    
    // If async, create a job and return the batch ID
    if (jobOptions.runAsync) {
      await this.createBatchJob(batchId, 'product_update', products.length, jobOptions.userId);
      
      // Start processing in the background
      this.processProductUpdateJob(batchId, products, jobOptions.userId).catch(error => {
        console.error(`Error processing batch job ${batchId}:`, error);
      });
      
      return batchId;
    }
    
    // Otherwise, process synchronously
    return await this.processProductUpdates(batchId, products, jobOptions.userId);
  }
  
  /**
   * Private method to create a batch job
   */
  private static async createBatchJob(
    batchId: string,
    operation: string,
    totalItems: number,
    userId: string
  ): Promise<void> {
    const job: BatchJobStatus = {
      batchId,
      operation,
      status: 'pending',
      progress: 0,
      totalItems,
      completedItems: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      userId
    };
    
    const key = this.BATCH_JOB_KEY_PREFIX + batchId;
    await txhashDB.put(key, JSON.stringify(job));
  }
  
  /**
   * Private method to update a batch job's status
   */
  private static async updateBatchJobStatus(
    batchId: string,
    updates: Partial<BatchJobStatus>
  ): Promise<void> {
    const key = this.BATCH_JOB_KEY_PREFIX + batchId;
    
    try {
      const jobData = await txhashDB.get(key);
      const job = JSON.parse(jobData);
      
      const updatedJob = {
        ...job,
        ...updates,
        updatedAt: Date.now()
      };
      
      // Calculate progress if not explicitly provided
      if (updates.completedItems !== undefined && !updates.progress) {
        updatedJob.progress = Math.floor((updatedJob.completedItems / updatedJob.totalItems) * 100);
      }
      
      await txhashDB.put(key, JSON.stringify(updatedJob));
    } catch (error) {
      console.error(`Error updating batch job ${batchId}:`, error);
    }
  }
  
  /**
   * Private method to process product creation in the background
   */
  private static async processProductCreationJob(
    batchId: string,
    farmerId: string,
    products: Array<any>,
    userId: string
  ): Promise<void> {
    try {
      // Update job status to processing
      await this.updateBatchJobStatus(batchId, {
        status: 'processing'
      });
      
      // Process the product creation
      const result = await this.processProductCreation(batchId, farmerId, products);
      
      // Update job status to completed with result
      await this.updateBatchJobStatus(batchId, {
        status: 'completed',
        progress: 100,
        completedItems: products.length,
        result
      });
    } catch (error) {
      // Update job status to failed
      await this.updateBatchJobStatus(batchId, {
        status: 'failed',
        error: (error as Error).message
      });
    }
  }
  
  /**
   * Private method to process product updates in the background
   */
  private static async processProductUpdateJob(
    batchId: string,
    products: Array<{ id: string, updates: any }>,
    userId: string
  ): Promise<void> {
    try {
      // Update job status to processing
      await this.updateBatchJobStatus(batchId, {
        status: 'processing'
      });
      
      // Process the product updates
      const result = await this.processProductUpdates(batchId, products, userId);
      
      // Update job status to completed with result
      await this.updateBatchJobStatus(batchId, {
        status: 'completed',
        progress: 100,
        completedItems: products.length,
        result
      });
    } catch (error) {
      // Update job status to failed
      await this.updateBatchJobStatus(batchId, {
        status: 'failed',
        error: (error as Error).message
      });
    }
  }
  
  /**
   * Private method to process product creation
   */
  private static async processProductCreation(
    batchId: string,
    farmerId: string,
    products: Array<any>
  ): Promise<BatchOperationResult> {
    const result: BatchOperationResult = {
      success: true,
      totalItems: products.length,
      successCount: 0,
      failedCount: 0,
      errors: [],
      successItems: [],
      batchId
    };
    
    // Process each product
    for (let i = 0; i < products.length; i++) {
      try {
        const product = products[i];
        
        // Required fields validation
        if (!product.name) {
          throw new Error("Product name is required");
        }
        
        // Create the product
        const createResult = await ProductService.createProduct(
          farmerId,
          {
            name: product.name,
            description: product.description,
            quantity: product.quantity || product.initialQuantity || 0,
            price: product.price,
            metadata: {
              ...(product.metadata || {}),
              batchId, // Add batch ID to metadata
              batchIndex: i
            },
            status: product.status
          },
          product
        );
        
        // Check if successful
        if (createResult.success && createResult.productId) {
          result.successCount++;
          result.successItems.push({
            index: i,
            id: createResult.productId,
            item: product
          });
          
          // Update batch job status
          if (i % 10 === 0 || i === products.length - 1) {
            await this.updateBatchJobStatus(batchId, {
              completedItems: i + 1
            });
          }
        } else {
          result.failedCount++;
          result.errors.push({
            index: i,
            item: product,
            error: createResult.message || "Unknown error"
          });
        }
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          index: i,
          item: products[i],
          error: (error as Error).message
        });
      }
    }
    
    // Set overall success status
    result.success = result.failedCount === 0;
    return result;
  }
  
  /**
   * Private method to process product updates
   */
  private static async processProductUpdates(
    batchId: string,
    products: Array<{ id: string, updates: any }>,
    userId: string
  ): Promise<BatchOperationResult> {
    const result: BatchOperationResult = {
      success: true,
      totalItems: products.length,
      successCount: 0,
      failedCount: 0,
      errors: [],
      successItems: [],
      batchId
    };
    
    // Process each product update
    for (let i = 0; i < products.length; i++) {
      try {
        const { id, updates } = products[i];
        
        // Get the current product
        const productData = await ProductService.getProduct(id);
        
        if (!productData) {
          throw new Error(`Product not found with ID: ${id}`);
        }
        
        // Check if user is the owner or admin
        if (productData.ownerId !== userId) {
          // Check if user is an admin
          // This would need a proper implementation based on your auth system
          const isAdmin = false; // Replace with actual admin check
          
          if (!isAdmin) {
            throw new Error(`User ${userId} is not authorized to update product ${id}`);
          }
        }
        
        // Update the product
        const updatedProduct = {
          ...productData,
          ...updates,
          updatedAt: Date.now(),
          metadata: {
            ...(productData.metadata || {}),
            ...(updates.metadata || {}),
            lastBatchUpdate: {
              batchId,
              timestamp: Date.now()
            }
          }
        };
        
        // Save the updated product
        await txhashDB.put(`product:${id}`, JSON.stringify(updatedProduct));
        
        result.successCount++;
        result.successItems.push({
          index: i,
          id,
          item: updatedProduct
        });
        
        // Update batch job status
        if (i % 10 === 0 || i === products.length - 1) {
          await this.updateBatchJobStatus(batchId, {
            completedItems: i + 1
          });
        }
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          index: i,
          item: products[i],
          error: (error as Error).message
        });
      }
    }
    
    // Set overall success status
    result.success = result.failedCount === 0;
    return result;
  }
}

export default BatchOperationsService; 