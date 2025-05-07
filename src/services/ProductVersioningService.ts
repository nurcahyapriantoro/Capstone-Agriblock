import { txhashDB } from "../helper/level.db.client";

/**
 * Interface for product version entry
 */
interface ProductVersion {
  versionId: string;
  productId: string;
  timestamp: number;
  data: any; // Full product data snapshot
  changes: Record<string, any>; // Only the fields that changed
  changedBy: string; // User ID who made the change
  changeType: 'create' | 'update' | 'transfer' | 'statusChange' | 'recall' | 'other';
  metadata?: Record<string, any>; // Any additional metadata
}

/**
 * Service for tracking product version history
 */
class ProductVersioningService {
  private static VERSION_KEY_PREFIX = "product_version:";
  private static VERSION_INDEX_PREFIX = "product_versions_index:";
  
  /**
   * Create a new version record when a product is created
   * @param productId ID of the product
   * @param productData Full product data
   * @param userId ID of the user creating the product
   * @param metadata Additional metadata
   * @returns Version ID
   */
  static async createInitialVersion(
    productId: string,
    productData: any,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const versionId = `${productId}-v1-${Date.now()}`;
    
    const version: ProductVersion = {
      versionId,
      productId,
      timestamp: Date.now(),
      data: { ...productData },
      changes: { ...productData }, // For initial version, changes = full data
      changedBy: userId,
      changeType: 'create',
      metadata
    };
    
    await this.saveVersion(version);
    await this.updateVersionIndex(productId, versionId, 1);
    
    return versionId;
  }
  
  /**
   * Record a new version when a product is updated
   * @param productId ID of the product
   * @param previousData Previous product data
   * @param newData New product data
   * @param userId ID of the user making the change
   * @param changeType Type of change
   * @param metadata Additional metadata
   * @returns New version ID
   */
  static async recordVersion(
    productId: string,
    previousData: any,
    newData: any,
    userId: string,
    changeType: 'update' | 'transfer' | 'statusChange' | 'recall' | 'other' = 'update',
    metadata?: Record<string, any>
  ): Promise<string> {
    // Get the current version number
    const currentVersion = await this.getCurrentVersionNumber(productId);
    const newVersionNumber = currentVersion + 1;
    const versionId = `${productId}-v${newVersionNumber}-${Date.now()}`;
    
    // Calculate changes
    const changes = this.calculateChanges(previousData, newData);
    
    const version: ProductVersion = {
      versionId,
      productId,
      timestamp: Date.now(),
      data: { ...newData },
      changes,
      changedBy: userId,
      changeType,
      metadata
    };
    
    await this.saveVersion(version);
    await this.updateVersionIndex(productId, versionId, newVersionNumber);
    
    return versionId;
  }
  
  /**
   * Get version history for a product
   * @param productId ID of the product
   * @param limit Maximum number of versions to return
   * @param offset Offset for pagination
   * @returns Array of versions
   */
  static async getVersionHistory(
    productId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<ProductVersion[]> {
    try {
      // Get the version index
      const indexKey = this.VERSION_INDEX_PREFIX + productId;
      let versionIndex: Record<number, string> = {};
      
      try {
        const indexData = await txhashDB.get(indexKey);
        versionIndex = JSON.parse(indexData);
      } catch (error) {
        // If no index found, return empty array
        return [];
      }
      
      // Get the version numbers in descending order
      const versionNumbers = Object.keys(versionIndex)
        .map(Number)
        .sort((a, b) => b - a)
        .slice(offset, offset + limit);
      
      // Get the versions
      const versionPromises = versionNumbers.map(versionNumber => {
        const versionId = versionIndex[versionNumber];
        return this.getVersion(versionId);
      });
      
      const versions = await Promise.all(versionPromises);
      return versions.filter(v => v !== null) as ProductVersion[];
    } catch (error) {
      console.error(`Error getting version history for product ${productId}:`, error);
      return [];
    }
  }
  
  /**
   * Get a specific version of a product
   * @param productId ID of the product
   * @param versionNumber Version number
   * @returns Product version or null if not found
   */
  static async getProductVersion(
    productId: string,
    versionNumber: number
  ): Promise<ProductVersion | null> {
    try {
      // Get the version index
      const indexKey = this.VERSION_INDEX_PREFIX + productId;
      
      try {
        const indexData = await txhashDB.get(indexKey);
        const versionIndex = JSON.parse(indexData);
        
        if (versionIndex[versionNumber]) {
          return await this.getVersion(versionIndex[versionNumber]);
        }
      } catch (error) {
        // If no index found or version not found, return null
        return null;
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting version ${versionNumber} for product ${productId}:`, error);
      return null;
    }
  }
  
  /**
   * Get latest version of a product
   * @param productId ID of the product
   * @returns Latest product version or null if not found
   */
  static async getLatestVersion(productId: string): Promise<ProductVersion | null> {
    const versionNumber = await this.getCurrentVersionNumber(productId);
    
    if (versionNumber === 0) {
      return null;
    }
    
    return await this.getProductVersion(productId, versionNumber);
  }
  
  /**
   * Get current version number for a product
   * @param productId ID of the product
   * @returns Current version number or 0 if no versions exist
   */
  static async getCurrentVersionNumber(productId: string): Promise<number> {
    try {
      const indexKey = this.VERSION_INDEX_PREFIX + productId;
      
      try {
        const indexData = await txhashDB.get(indexKey);
        const versionIndex = JSON.parse(indexData);
        
        // Get highest version number
        const versionNumbers = Object.keys(versionIndex).map(Number);
        if (versionNumbers.length === 0) {
          return 0;
        }
        
        return Math.max(...versionNumbers);
      } catch (error) {
        // If no index found, return 0
        return 0;
      }
    } catch (error) {
      console.error(`Error getting current version number for product ${productId}:`, error);
      return 0;
    }
  }
  
  /**
   * Compare two products and identify the changes
   * @param oldData Old product data
   * @param newData New product data
   * @returns Object with only the changed fields
   */
  private static calculateChanges(oldData: any, newData: any): Record<string, any> {
    const changes: Record<string, any> = {};
    
    // Check all properties in the new data
    for (const key in newData) {
      // Skip if this is a function or symbol
      if (typeof newData[key] === 'function' || typeof newData[key] === 'symbol') {
        continue;
      }
      
      // If the old data doesn't have this property or values are different
      if (!(key in oldData) || JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes[key] = newData[key];
      }
    }
    
    // Check for removed properties
    for (const key in oldData) {
      if (!(key in newData)) {
        changes[key] = null; // Mark as removed
      }
    }
    
    return changes;
  }
  
  /**
   * Save a version to the database
   * @param version Version to save
   */
  private static async saveVersion(version: ProductVersion): Promise<void> {
    const key = this.VERSION_KEY_PREFIX + version.versionId;
    await txhashDB.put(key, JSON.stringify(version));
  }
  
  /**
   * Get a version from the database
   * @param versionId ID of the version
   * @returns Version or null if not found
   */
  private static async getVersion(versionId: string): Promise<ProductVersion | null> {
    try {
      const key = this.VERSION_KEY_PREFIX + versionId;
      const data = await txhashDB.get(key);
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error getting version ${versionId}:`, error);
      return null;
    }
  }
  
  /**
   * Update the version index for a product
   * @param productId ID of the product
   * @param versionId ID of the version
   * @param versionNumber Version number
   */
  private static async updateVersionIndex(
    productId: string,
    versionId: string,
    versionNumber: number
  ): Promise<void> {
    const indexKey = this.VERSION_INDEX_PREFIX + productId;
    
    try {
      // Try to get existing index
      let versionIndex: Record<number, string> = {};
      try {
        const indexData = await txhashDB.get(indexKey);
        versionIndex = JSON.parse(indexData);
      } catch (error) {
        // If no index found, create a new one
        versionIndex = {};
      }
      
      // Update the index
      versionIndex[versionNumber] = versionId;
      
      // Save the updated index
      await txhashDB.put(indexKey, JSON.stringify(versionIndex));
    } catch (error) {
      console.error(`Error updating version index for product ${productId}:`, error);
    }
  }
}

export default ProductVersioningService; 