import { SmartContract } from './ISmartContract';
import { Level } from 'level';
import { UserRole } from '../enum';

/**
 * Product trace data structure
 */
interface TraceData {
  traceId: string;
  productId: string;
  timestamp: number;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  action: TraceAction;
  actor: {
    userId: string;
    role: UserRole;
  };
  metadata?: Record<string, any>;
}

/**
 * Product details and information
 */
interface ProductData {
  id: string;
  name: string;
  description?: string;
  type: string;
  origin: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  originTimestamp: number;
  currentOwner: string;
  certifications?: string[];
  properties?: Record<string, any>;
  status: ProductStatus;
  metadata?: Record<string, any>;
}

/**
 * Batch information for product grouping
 */
interface BatchData {
  batchId: string;
  name: string;
  description?: string;
  productIds: string[];
  createdTimestamp: number;
  createdBy: string;
  status: BatchStatus;
  metadata?: Record<string, any>;
}

/**
 * Operation result
 */
interface TraceabilityResult {
  success: boolean;
  message?: string;
  traceId?: string;
  productId?: string;
  batchId?: string;
  data?: TraceData | ProductData | BatchData;
}

/**
 * Trace action enum
 */
enum TraceAction {
  PRODUCED = 'PRODUCED',
  PROCESSED = 'PROCESSED',
  PACKAGED = 'PACKAGED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  STORED = 'STORED',
  SOLD = 'SOLD',
  DAMAGED = 'DAMAGED',
  DISPOSED = 'DISPOSED',
  INSPECTED = 'INSPECTED',
  CERTIFIED = 'CERTIFIED',
  TRANSFERRED = 'TRANSFERRED'
}

/**
 * Product status enum
 */
enum ProductStatus {
  CREATED = 'CREATED',
  IN_TRANSIT = 'IN_TRANSIT',
  STORED = 'STORED',
  SOLD = 'SOLD',
  DAMAGED = 'DAMAGED',
  DISPOSED = 'DISPOSED'
}

/**
 * Batch status enum
 */
enum BatchStatus {
  CREATED = 'CREATED',
  IN_PROCESS = 'IN_PROCESS',
  COMPLETED = 'COMPLETED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  STORED = 'STORED',
  SOLD = 'SOLD',
  DAMAGED = 'DAMAGED',
  DISPOSED = 'DISPOSED'
}

/**
 * Smart contract for managing product traceability and supply chain tracking
 * Provides comprehensive tracking of product lifecycle from production to final sale
 */
export class TraceabilityContract extends SmartContract {
  constructor(stateDB: Level<string, string>) {
    super(
      'traceability-v1',
      'Traceability',
      '1.0.0',
      stateDB
    );
  }

  /**
   * Initialize the contract
   */
  public async initialize(): Promise<boolean> {
    // No specific initialization needed yet
    return true;
  }

  /**
   * Execute a contract method
   * @param method Method to execute
   * @param params Method parameters
   * @param sender Identity of the caller
   */
  public async execute(method: string, params: any, sender: string): Promise<TraceabilityResult> {
    // Verify the sender is authorized to call this method
    const authorized = await this.verifySender(sender, method);
    if (!authorized) {
      return {
        success: false,
        message: `Unauthorized: User ${sender} cannot execute method ${method}`
      };
    }
    
    switch (method) {
      case 'createProduct':
        return this.createProduct(
          params.name,
          params.type,
          params.latitude,
          params.longitude,
          params.address,
          params.owner,
          params.description,
          params.certifications,
          params.properties,
          params.metadata
        );
      
      case 'updateProductStatus':
        return this.updateProductStatus(
          params.productId,
          params.status
        );
      
      case 'addProductTrace':
        return this.addProductTrace(
          params.productId,
          params.latitude,
          params.longitude,
          params.action,
          params.userId,
          params.role,
          params.address,
          params.metadata
        );
      
      case 'createBatch':
        return this.createBatch(
          params.name,
          params.productIds,
          params.createdBy,
          params.description,
          params.metadata
        );
      
      case 'updateBatchStatus':
        return this.updateBatchStatus(
          params.batchId,
          params.status
        );
      
      case 'addProductToBatch':
        return this.addProductToBatch(
          params.batchId,
          params.productId
        );
      
      case 'removeProductFromBatch':
        return this.removeProductFromBatch(
          params.batchId,
          params.productId
        );
      
      case 'changeProductOwner':
        return this.changeProductOwner(
          params.productId,
          params.newOwner
        );
      
      case 'addProductCertification':
        return this.addProductCertification(
          params.productId,
          params.certification
        );
      
      default:
        return {
          success: false,
          message: `Method ${method} not found in TraceabilityContract`
        };
    }
  }

  /**
   * Query contract state
   * @param method Method to query
   * @param params Method parameters
   */
  public async query(method: string, params: any): Promise<any> {
    switch (method) {
      case 'getProduct':
        return this.getProduct(params.productId);
      
      case 'getProductTraces':
        return this.getProductTraces(params.productId);
      
      case 'getBatch':
        return this.getBatch(params.batchId);
      
      case 'getBatchProducts':
        return this.getBatchProducts(params.batchId);
      
      case 'getProductsByOwner':
        return this.getProductsByOwner(params.owner);
      
      case 'getProductsByStatus':
        return this.getProductsByStatus(params.status);
      
      case 'getProductsByType':
        return this.getProductsByType(params.type);
      
      case 'getProductHistory':
        return this.getProductHistory(params.productId);
      
      default:
        throw new Error(`Query method ${method} not found in TraceabilityContract`);
    }
  }

  /**
   * Get contract's state schema
   */
  public getStateSchema(): Record<string, any> {
    return {
      products: 'Map<string, ProductData>',
      traces: 'Map<string, TraceData[]>',
      batches: 'Map<string, BatchData>',
      productsByOwner: 'Map<string, string[]>',
      productsByStatus: 'Map<string, string[]>',
      productsByType: 'Map<string, string[]>',
      productsByBatch: 'Map<string, string>'
    };
  }

  /**
   * Create a new product
   */
  private async createProduct(
    name: string,
    type: string,
    latitude: number,
    longitude: number,
    owner: string,
    address?: string,
    description?: string,
    certifications?: string[],
    properties?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<TraceabilityResult> {
    // Generate a unique product ID
    const productId = `product_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create product data
    const product: ProductData = {
      id: productId,
      name,
      type,
      description,
      origin: {
        latitude,
        longitude,
        address
      },
      originTimestamp: Date.now(),
      currentOwner: owner,
      certifications,
      properties,
      status: ProductStatus.CREATED,
      metadata
    };
    
    // Create initial trace for product creation
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const trace: TraceData = {
      traceId,
      productId,
      timestamp: Date.now(),
      location: {
        latitude,
        longitude,
        address
      },
      action: TraceAction.PRODUCED,
      actor: {
        userId: owner,
        role: UserRole.PRODUCER
      },
      metadata
    };
    
    // Save product to state
    await this.writeState<ProductData>(`product:${productId}`, product);
    
    // Save initial trace to state
    await this.writeState<TraceData[]>(`product_traces:${productId}`, [trace]);
    
    // Update indexes
    await this.updateProductOwnerIndex(productId, owner);
    await this.updateProductStatusIndex(productId, ProductStatus.CREATED);
    await this.updateProductTypeIndex(productId, type);
    
    // Emit product created event
    await this.emitEvent('ProductCreated', { 
      productId, 
      name, 
      type, 
      owner 
    });
    
    // Emit trace added event
    await this.emitEvent('TraceAdded', { 
      traceId, 
      productId, 
      action: TraceAction.PRODUCED, 
      actor: owner 
    });
    
    return {
      success: true,
      productId,
      traceId,
      message: 'Product created successfully',
      data: product
    };
  }

  /**
   * Update a product's status
   */
  private async updateProductStatus(
    productId: string,
    status: ProductStatus
  ): Promise<TraceabilityResult> {
    // Get product data
    const product = await this.getProduct(productId);
    
    if (!product) {
      return {
        success: false,
        message: `Product with ID ${productId} not found`
      };
    }
    
    // Remove from old status index
    await this.removeFromProductStatusIndex(productId, product.status);
    
    // Update product status
    const oldStatus = product.status;
    product.status = status;
    
    // Save updated product
    await this.writeState<ProductData>(`product:${productId}`, product);
    
    // Update status index
    await this.updateProductStatusIndex(productId, status);
    
    // Emit product status updated event
    await this.emitEvent('ProductStatusUpdated', { 
      productId, 
      oldStatus, 
      newStatus: status 
    });
    
    return {
      success: true,
      productId,
      message: 'Product status updated successfully',
      data: product
    };
  }

  /**
   * Add a trace to a product's history
   */
  private async addProductTrace(
    productId: string,
    latitude: number,
    longitude: number,
    action: TraceAction,
    userId: string,
    role: UserRole,
    address?: string,
    metadata?: Record<string, any>
  ): Promise<TraceabilityResult> {
    // Get product data
    const product = await this.getProduct(productId);
    
    if (!product) {
      return {
        success: false,
        message: `Product with ID ${productId} not found`
      };
    }
    
    // Generate a unique trace ID
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create trace data
    const trace: TraceData = {
      traceId,
      productId,
      timestamp: Date.now(),
      location: {
        latitude,
        longitude,
        address
      },
      action,
      actor: {
        userId,
        role
      },
      metadata
    };
    
    // Get existing traces and add new one
    const traces = await this.readState<TraceData[]>(`product_traces:${productId}`) || [];
    traces.push(trace);
    
    // Save updated traces
    await this.writeState<TraceData[]>(`product_traces:${productId}`, traces);
    
    // Update product status based on action if needed
    if (action === TraceAction.SHIPPED) {
      await this.updateProductStatus(productId, ProductStatus.IN_TRANSIT);
    } else if (action === TraceAction.STORED) {
      await this.updateProductStatus(productId, ProductStatus.STORED);
    } else if (action === TraceAction.SOLD) {
      await this.updateProductStatus(productId, ProductStatus.SOLD);
    } else if (action === TraceAction.DAMAGED) {
      await this.updateProductStatus(productId, ProductStatus.DAMAGED);
    } else if (action === TraceAction.DISPOSED) {
      await this.updateProductStatus(productId, ProductStatus.DISPOSED);
    }
    
    // Emit trace added event
    await this.emitEvent('TraceAdded', { 
      traceId, 
      productId, 
      action, 
      actor: userId 
    });
    
    return {
      success: true,
      traceId,
      productId,
      message: 'Trace added successfully',
      data: trace
    };
  }

  /**
   * Create a new batch of products
   */
  private async createBatch(
    name: string,
    productIds: string[],
    createdBy: string,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<TraceabilityResult> {
    // Validate all products exist
    for (const productId of productIds) {
      const product = await this.getProduct(productId);
      if (!product) {
        return {
          success: false,
          message: `Product with ID ${productId} not found`
        };
      }
    }
    
    // Generate a unique batch ID
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create batch data
    const batch: BatchData = {
      batchId,
      name,
      description,
      productIds,
      createdTimestamp: Date.now(),
      createdBy,
      status: BatchStatus.CREATED,
      metadata
    };
    
    // Save batch to state
    await this.writeState<BatchData>(`batch:${batchId}`, batch);
    
    // Update product to batch mapping
    for (const productId of productIds) {
      await this.writeState<string>(`product_batch:${productId}`, batchId);
    }
    
    // Emit batch created event
    await this.emitEvent('BatchCreated', { 
      batchId, 
      name, 
      productCount: productIds.length, 
      createdBy 
    });
    
    return {
      success: true,
      batchId,
      message: 'Batch created successfully',
      data: batch
    };
  }

  /**
   * Update a batch's status
   */
  private async updateBatchStatus(
    batchId: string,
    status: BatchStatus
  ): Promise<TraceabilityResult> {
    // Get batch data
    const batch = await this.getBatch(batchId);
    
    if (!batch) {
      return {
        success: false,
        message: `Batch with ID ${batchId} not found`
      };
    }
    
    // Update batch status
    const oldStatus = batch.status;
    batch.status = status;
    
    // Save updated batch
    await this.writeState<BatchData>(`batch:${batchId}`, batch);
    
    // Emit batch status updated event
    await this.emitEvent('BatchStatusUpdated', { 
      batchId, 
      oldStatus, 
      newStatus: status 
    });
    
    return {
      success: true,
      batchId,
      message: 'Batch status updated successfully',
      data: batch
    };
  }

  /**
   * Add a product to a batch
   */
  private async addProductToBatch(
    batchId: string,
    productId: string
  ): Promise<TraceabilityResult> {
    // Get batch data
    const batch = await this.getBatch(batchId);
    
    if (!batch) {
      return {
        success: false,
        message: `Batch with ID ${batchId} not found`
      };
    }
    
    // Get product data
    const product = await this.getProduct(productId);
    
    if (!product) {
      return {
        success: false,
        message: `Product with ID ${productId} not found`
      };
    }
    
    // Check if product is already in batch
    if (batch.productIds.includes(productId)) {
      return {
        success: false,
        message: `Product with ID ${productId} is already in batch ${batchId}`
      };
    }
    
    // Add product to batch
    batch.productIds.push(productId);
    
    // Save updated batch
    await this.writeState<BatchData>(`batch:${batchId}`, batch);
    
    // Update product to batch mapping
    await this.writeState<string>(`product_batch:${productId}`, batchId);
    
    // Emit product added to batch event
    await this.emitEvent('ProductAddedToBatch', { 
      batchId, 
      productId 
    });
    
    return {
      success: true,
      batchId,
      productId,
      message: 'Product added to batch successfully',
      data: batch
    };
  }

  /**
   * Remove a product from a batch
   */
  private async removeProductFromBatch(
    batchId: string,
    productId: string
  ): Promise<TraceabilityResult> {
    // Get batch data
    const batch = await this.getBatch(batchId);
    
    if (!batch) {
      return {
        success: false,
        message: `Batch with ID ${batchId} not found`
      };
    }
    
    // Check if product is in batch
    if (!batch.productIds.includes(productId)) {
      return {
        success: false,
        message: `Product with ID ${productId} is not in batch ${batchId}`
      };
    }
    
    // Remove product from batch
    batch.productIds = batch.productIds.filter(id => id !== productId);
    
    // Save updated batch
    await this.writeState<BatchData>(`batch:${batchId}`, batch);
    
    // Delete product to batch mapping
    await this.deleteState(`product_batch:${productId}`);
    
    // Emit product removed from batch event
    await this.emitEvent('ProductRemovedFromBatch', { 
      batchId, 
      productId 
    });
    
    return {
      success: true,
      batchId,
      productId,
      message: 'Product removed from batch successfully',
      data: batch
    };
  }

  /**
   * Change a product's owner
   */
  private async changeProductOwner(
    productId: string,
    newOwner: string
  ): Promise<TraceabilityResult> {
    // Get product data
    const product = await this.getProduct(productId);
    
    if (!product) {
      return {
        success: false,
        message: `Product with ID ${productId} not found`
      };
    }
    
    // Update ownership indexes
    await this.removeFromProductOwnerIndex(productId, product.currentOwner);
    
    // Update product owner
    const oldOwner = product.currentOwner;
    product.currentOwner = newOwner;
    
    // Save updated product
    await this.writeState<ProductData>(`product:${productId}`, product);
    
    // Update ownership indexes
    await this.updateProductOwnerIndex(productId, newOwner);
    
    // Emit ownership changed event
    await this.emitEvent('ProductOwnershipChanged', { 
      productId, 
      oldOwner, 
      newOwner 
    });
    
    return {
      success: true,
      productId,
      message: 'Product ownership changed successfully',
      data: product
    };
  }

  /**
   * Add a certification to a product
   */
  private async addProductCertification(
    productId: string,
    certification: string
  ): Promise<TraceabilityResult> {
    // Get product data
    const product = await this.getProduct(productId);
    
    if (!product) {
      return {
        success: false,
        message: `Product with ID ${productId} not found`
      };
    }
    
    // Initialize certifications array if it doesn't exist
    if (!product.certifications) {
      product.certifications = [];
    }
    
    // Check if certification already exists
    if (product.certifications.includes(certification)) {
      return {
        success: false,
        message: `Product already has certification: ${certification}`
      };
    }
    
    // Add certification
    product.certifications.push(certification);
    
    // Save updated product
    await this.writeState<ProductData>(`product:${productId}`, product);
    
    // Emit certification added event
    await this.emitEvent('ProductCertificationAdded', { 
      productId, 
      certification 
    });
    
    return {
      success: true,
      productId,
      message: 'Product certification added successfully',
      data: product
    };
  }

  /**
   * Get product by ID
   */
  private async getProduct(productId: string): Promise<ProductData | null> {
    return this.readState<ProductData>(`product:${productId}`);
  }

  /**
   * Get product traces by product ID
   */
  private async getProductTraces(productId: string): Promise<TraceData[]> {
    const traces = await this.readState<TraceData[]>(`product_traces:${productId}`);
    return traces || [];
  }

  /**
   * Get batch by ID
   */
  private async getBatch(batchId: string): Promise<BatchData | null> {
    return this.readState<BatchData>(`batch:${batchId}`);
  }

  /**
   * Get products in a batch
   */
  private async getBatchProducts(batchId: string): Promise<ProductData[]> {
    const batch = await this.getBatch(batchId);
    if (!batch) return [];
    
    const products: ProductData[] = [];
    for (const productId of batch.productIds) {
      const product = await this.getProduct(productId);
      if (product) {
        products.push(product);
      }
    }
    
    return products;
  }

  /**
   * Get products by owner
   */
  private async getProductsByOwner(owner: string): Promise<ProductData[]> {
    const productIds = await this.readState<string[]>(`owner_products:${owner}`) || [];
    const products: ProductData[] = [];
    
    for (const productId of productIds) {
      const product = await this.getProduct(productId);
      if (product) {
        products.push(product);
      }
    }
    
    return products;
  }

  /**
   * Get products by status
   */
  private async getProductsByStatus(status: ProductStatus): Promise<ProductData[]> {
    const productIds = await this.readState<string[]>(`status_products:${status}`) || [];
    const products: ProductData[] = [];
    
    for (const productId of productIds) {
      const product = await this.getProduct(productId);
      if (product) {
        products.push(product);
      }
    }
    
    return products;
  }

  /**
   * Get products by type
   */
  private async getProductsByType(type: string): Promise<ProductData[]> {
    const productIds = await this.readState<string[]>(`type_products:${type}`) || [];
    const products: ProductData[] = [];
    
    for (const productId of productIds) {
      const product = await this.getProduct(productId);
      if (product) {
        products.push(product);
      }
    }
    
    return products;
  }

  /**
   * Get product history (all traces in chronological order)
   */
  private async getProductHistory(productId: string): Promise<TraceData[]> {
    const traces = await this.getProductTraces(productId);
    
    // Sort traces by timestamp ascending
    return traces.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Helper: Update the product owner index
   */
  private async updateProductOwnerIndex(productId: string, owner: string): Promise<void> {
    const ownerProductsKey = `owner_products:${owner}`;
    const ownerProducts = await this.readState<string[]>(ownerProductsKey) || [];
    
    if (!ownerProducts.includes(productId)) {
      ownerProducts.push(productId);
      await this.writeState<string[]>(ownerProductsKey, ownerProducts);
    }
  }

  /**
   * Helper: Remove product from owner index
   */
  private async removeFromProductOwnerIndex(productId: string, owner: string): Promise<void> {
    const ownerProductsKey = `owner_products:${owner}`;
    const ownerProducts = await this.readState<string[]>(ownerProductsKey) || [];
    
    const updatedOwnerProducts = ownerProducts.filter(id => id !== productId);
    await this.writeState<string[]>(ownerProductsKey, updatedOwnerProducts);
  }

  /**
   * Helper: Update the product status index
   */
  private async updateProductStatusIndex(productId: string, status: ProductStatus): Promise<void> {
    const statusProductsKey = `status_products:${status}`;
    const statusProducts = await this.readState<string[]>(statusProductsKey) || [];
    
    if (!statusProducts.includes(productId)) {
      statusProducts.push(productId);
      await this.writeState<string[]>(statusProductsKey, statusProducts);
    }
  }

  /**
   * Helper: Remove product from status index
   */
  private async removeFromProductStatusIndex(productId: string, status: ProductStatus): Promise<void> {
    const statusProductsKey = `status_products:${status}`;
    const statusProducts = await this.readState<string[]>(statusProductsKey) || [];
    
    const updatedStatusProducts = statusProducts.filter(id => id !== productId);
    await this.writeState<string[]>(statusProductsKey, updatedStatusProducts);
  }

  /**
   * Helper: Update the product type index
   */
  private async updateProductTypeIndex(productId: string, type: string): Promise<void> {
    const typeProductsKey = `type_products:${type}`;
    const typeProducts = await this.readState<string[]>(typeProductsKey) || [];
    
    if (!typeProducts.includes(productId)) {
      typeProducts.push(productId);
      await this.writeState<string[]>(typeProductsKey, typeProducts);
    }
  }
} 