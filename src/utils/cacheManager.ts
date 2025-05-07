/**
 * Simple in-memory cache manager
 * Caches frequently accessed data with TTL support
 */

interface CacheItem<T> {
  value: T;
  expiresAt: number | null; // Timestamp when the item expires (null for no expiration)
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
}

class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheItem<any>>;
  private hitCount: number = 0;
  private missCount: number = 0;
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default TTL
  
  private constructor() {
    this.cache = new Map();
    this.startCleanupInterval();
  }
  
  /**
   * Get the singleton instance of the cache manager
   */
  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }
  
  /**
   * Set an item in the cache
   * @param key Cache key
   * @param value Value to cache
   * @param options Caching options
   */
  public set<T>(key: string, value: T, options: CacheOptions = {}): void {
    const ttl = options.ttl !== undefined ? options.ttl : this.defaultTTL;
    const expiresAt = ttl > 0 ? Date.now() + ttl : null;
    
    this.cache.set(key, {
      value,
      expiresAt
    });
  }
  
  /**
   * Get an item from the cache
   * @param key Cache key
   * @returns Cached value or undefined if not found or expired
   */
  public get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      this.missCount++;
      return undefined;
    }
    
    // Check if item has expired
    if (item.expiresAt !== null && item.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.missCount++;
      return undefined;
    }
    
    this.hitCount++;
    return item.value as T;
  }
  
  /**
   * Delete an item from the cache
   * @param key Cache key
   * @returns true if an item was deleted, false otherwise
   */
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * Check if a key exists in the cache and is not expired
   * @param key Cache key
   * @returns true if the key exists and is not expired, false otherwise
   */
  public has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }
    
    // Check if item has expired
    if (item.expiresAt !== null && item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Clear the entire cache
   */
  public clear(): void {
    this.cache.clear();
  }
  
  /**
   * Clear all expired items from the cache
   * @returns Number of items cleared
   */
  public clearExpired(): number {
    let count = 0;
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt !== null && item.expiresAt < now) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Get cache statistics
   */
  public getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRatio: number;
  } {
    const totalRequests = this.hitCount + this.missCount;
    const hitRatio = totalRequests > 0 ? this.hitCount / totalRequests : 0;
    
    return {
      size: this.cache.size,
      hits: this.hitCount,
      misses: this.missCount,
      hitRatio
    };
  }
  
  /**
   * Get or set an item from/to the cache
   * @param key Cache key
   * @param callback Function to call to get the value if not in cache
   * @param options Caching options
   * @returns Cached or computed value
   */
  public async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cachedValue = this.get<T>(key);
    
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    // Not in cache, get fresh value
    const value = await callback();
    
    // Cache the value
    this.set(key, value, options);
    
    return value;
  }
  
  /**
   * Clear cache entries that match a pattern
   * @param pattern Regex pattern to match against keys
   * @returns Number of items cleared
   */
  public clearPattern(pattern: RegExp): number {
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Start periodic cleanup of expired items
   */
  private startCleanupInterval(): void {
    // Clear expired items every minute
    setInterval(() => {
      this.clearExpired();
    }, 60 * 1000);
  }
}

// Export singleton instance
export default CacheManager.getInstance(); 