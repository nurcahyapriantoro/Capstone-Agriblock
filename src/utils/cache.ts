import { logger } from './logger';

interface CacheItem<T> {
  value: T;
  expiry: number;
}

/**
 * Cache sederhana untuk menyimpan data sementara di memory
 * Gunakan untuk data yang sering diakses dan jarang berubah
 */
class MemoryCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  
  /**
   * Set nilai ke cache
   * @param key Kunci cache
   * @param value Nilai untuk disimpan
   * @param ttlSeconds Time to live dalam detik (default: 5 menit)
   */
  set<T>(key: string, value: T, ttlSeconds = 300): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiry });
    logger.debug(`Cache set: ${key} (TTL: ${ttlSeconds}s)`);
  }
  
  /**
   * Ambil nilai dari cache
   * @param key Kunci cache
   * @returns Nilai yang di-cache atau null jika tidak ditemukan atau kedaluwarsa
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    // Jika item tidak ditemukan
    if (!item) {
      logger.debug(`Cache miss: ${key}`);
      return null;
    }
    
    // Jika item kedaluwarsa
    if (Date.now() > item.expiry) {
      logger.debug(`Cache expired: ${key}`);
      this.delete(key);
      return null;
    }
    
    logger.debug(`Cache hit: ${key}`);
    return item.value as T;
  }
  
  /**
   * Hapus item dari cache
   * @param key Kunci cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Bersihkan seluruh cache
   */
  clear(): void {
    this.cache.clear();
    logger.debug('Cache cleared');
  }
  
  /**
   * Hapus semua item yang kedaluwarsa
   */
  cleanExpired(): void {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      logger.debug(`Cleaned ${expiredCount} expired cache items`);
    }
  }
  
  /**
   * Get or set cache value dengan callback untuk mengisi cache jika miss
   * @param key Kunci cache
   * @param fallbackFn Fungsi untuk mendapatkan nilai jika cache miss
   * @param ttlSeconds TTL dalam detik
   * @returns Nilai dari cache atau hasil dari fallback function
   */
  async getOrSet<T>(
    key: string, 
    fallbackFn: () => Promise<T>, 
    ttlSeconds = 300
  ): Promise<T> {
    // Coba dapatkan dari cache
    const cachedValue = this.get<T>(key);
    
    if (cachedValue !== null) {
      return cachedValue;
    }
    
    // Jika tidak ada di cache, dapatkan dari fungsi fallback
    try {
      const value = await fallbackFn();
      this.set(key, value, ttlSeconds);
      return value;
    } catch (error) {
      logger.error(`Error in cache fallback for key ${key}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const cache = new MemoryCache();

// Setup interval untuk membersihkan cache yang kedaluwarsa (setiap 15 menit)
setInterval(() => {
  cache.cleanExpired();
}, 15 * 60 * 1000); 