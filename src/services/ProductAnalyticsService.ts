import { txhashDB } from "../helper/level.db.client";

/**
 * Interface for product view event
 */
interface ProductViewEvent {
  productId: string;
  userId?: string;
  timestamp: number;
  ip?: string;
  userAgent?: string;
}

/**
 * Interface for product analytics data
 */
interface ProductAnalytics {
  productId: string;
  viewCount: number;
  lastViewed: number | null;
  uniqueViewers: Set<string>; // Set of user IDs or IPs
  transactionCount: number;
  popularityScore: number;
  viewHistory: ProductViewEvent[];
}

/**
 * Service for tracking and analyzing product interactions
 */
class ProductAnalyticsService {
  private static ANALYTICS_KEY_PREFIX = "product_analytics:";
  private static VIEW_HISTORY_SIZE = 100; // Keep last 100 views
  
  /**
   * Record a product view event
   * @param productId ID of the viewed product
   * @param userId ID of the user viewing the product (optional)
   * @param ip IP address of the viewer (optional)
   * @param userAgent User agent of the viewer (optional)
   */
  static async recordView(
    productId: string, 
    userId?: string, 
    ip?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const analytics = await this.getProductAnalytics(productId);
      
      // Record the view event
      const viewEvent: ProductViewEvent = {
        productId,
        userId,
        timestamp: Date.now(),
        ip,
        userAgent
      };
      
      // Update analytics data
      analytics.viewCount += 1;
      analytics.lastViewed = viewEvent.timestamp;
      
      // Track unique viewers using either userId or IP
      const viewerId = userId || ip;
      if (viewerId) {
        analytics.uniqueViewers.add(viewerId);
      }
      
      // Add to view history, keeping only the most recent views
      analytics.viewHistory.unshift(viewEvent);
      if (analytics.viewHistory.length > this.VIEW_HISTORY_SIZE) {
        analytics.viewHistory = analytics.viewHistory.slice(0, this.VIEW_HISTORY_SIZE);
      }
      
      // Calculate popularity score (simple algorithm)
      // Can be adjusted based on business needs
      const dayInMs = 24 * 60 * 60 * 1000;
      const recencyWeight = 0.7;
      const viewCountWeight = 0.2;
      const transactionWeight = 0.1;
      
      const viewRecency = Math.max(0, 1 - (Date.now() - (analytics.lastViewed || 0)) / (30 * dayInMs));
      analytics.popularityScore = (
        recencyWeight * viewRecency +
        viewCountWeight * Math.min(1, analytics.viewCount / 1000) +
        transactionWeight * Math.min(1, analytics.transactionCount / 100)
      );
      
      // Save updated analytics
      await this.saveProductAnalytics(productId, analytics);
    } catch (error) {
      console.error("Error recording product view:", error);
    }
  }
  
  /**
   * Record a product transaction
   * @param productId ID of the product involved in the transaction
   */
  static async recordTransaction(productId: string): Promise<void> {
    try {
      const analytics = await this.getProductAnalytics(productId);
      
      // Increment transaction count
      analytics.transactionCount += 1;
      
      // Recalculate popularity score
      const dayInMs = 24 * 60 * 60 * 1000;
      const recencyWeight = 0.7;
      const viewCountWeight = 0.2;
      const transactionWeight = 0.1;
      
      const viewRecency = Math.max(0, 1 - (Date.now() - (analytics.lastViewed || 0)) / (30 * dayInMs));
      analytics.popularityScore = (
        recencyWeight * viewRecency +
        viewCountWeight * Math.min(1, analytics.viewCount / 1000) +
        transactionWeight * Math.min(1, analytics.transactionCount / 100)
      );
      
      // Save updated analytics
      await this.saveProductAnalytics(productId, analytics);
    } catch (error) {
      console.error("Error recording product transaction:", error);
    }
  }
  
  /**
   * Get analytics data for a product
   * @param productId ID of the product
   * @returns Product analytics data
   */
  static async getProductAnalytics(productId: string): Promise<ProductAnalytics> {
    try {
      // Try to get existing analytics data
      const key = this.ANALYTICS_KEY_PREFIX + productId;
      
      try {
        const data = await txhashDB.get(key);
        const parsed = JSON.parse(data);
        
        // Convert unique viewers back to a Set
        return {
          ...parsed,
          uniqueViewers: new Set(parsed.uniqueViewers)
        };
      } catch (err) {
        // If not found, create a new analytics object
        return {
          productId,
          viewCount: 0,
          lastViewed: null,
          uniqueViewers: new Set<string>(),
          transactionCount: 0,
          popularityScore: 0,
          viewHistory: []
        };
      }
    } catch (error) {
      console.error("Error getting product analytics:", error);
      
      // Return default analytics object
      return {
        productId,
        viewCount: 0,
        lastViewed: null,
        uniqueViewers: new Set<string>(),
        transactionCount: 0,
        popularityScore: 0,
        viewHistory: []
      };
    }
  }
  
  /**
   * Get the most popular products
   * @param limit Maximum number of products to return
   * @returns Array of product IDs and their popularity scores
   */
  static async getMostPopularProducts(limit: number = 10): Promise<Array<{productId: string, popularityScore: number}>> {
    try {
      // Get all analytics keys
      const allKeys = await txhashDB.keys().all();
      const analyticsKeys = allKeys.filter(key => 
        key.toString().startsWith(this.ANALYTICS_KEY_PREFIX)
      );
      
      // Get all analytics data
      const analyticsPromises = analyticsKeys.map(key => 
        txhashDB.get(key).then(data => JSON.parse(data))
      );
      
      const analyticsData = await Promise.all(analyticsPromises);
      
      // Sort by popularity score and take the top results
      return analyticsData
        .sort((a, b) => b.popularityScore - a.popularityScore)
        .slice(0, limit)
        .map(item => ({
          productId: item.productId,
          popularityScore: item.popularityScore
        }));
    } catch (error) {
      console.error("Error getting popular products:", error);
      return [];
    }
  }
  
  /**
   * Get statistics for a product 
   * @param productId ID of the product
   * @returns Statistics object with view counts and transaction counts
   */
  static async getProductStats(productId: string): Promise<{
    viewCount: number;
    uniqueViewCount: number;
    transactionCount: number;
    popularityScore: number;
    lastViewed: number | null;
  }> {
    try {
      const analytics = await this.getProductAnalytics(productId);
      
      return {
        viewCount: analytics.viewCount,
        uniqueViewCount: analytics.uniqueViewers.size,
        transactionCount: analytics.transactionCount,
        popularityScore: analytics.popularityScore,
        lastViewed: analytics.lastViewed
      };
    } catch (error) {
      console.error("Error getting product stats:", error);
      
      return {
        viewCount: 0,
        uniqueViewCount: 0,
        transactionCount: 0,
        popularityScore: 0,
        lastViewed: null
      };
    }
  }
  
  /**
   * Private method to save analytics data
   * @param productId ID of the product
   * @param analytics Analytics data to save
   */
  private static async saveProductAnalytics(productId: string, analytics: ProductAnalytics): Promise<void> {
    const key = this.ANALYTICS_KEY_PREFIX + productId;
    
    // Convert Set to array for storage
    const analyticsData = {
      ...analytics,
      uniqueViewers: Array.from(analytics.uniqueViewers)
    };
    
    await txhashDB.put(key, JSON.stringify(analyticsData));
  }
}

export default ProductAnalyticsService; 