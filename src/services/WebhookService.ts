import axios from 'axios';
import { txhashDB } from '../helper/level.db.client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Webhook subscription model
 */
interface WebhookSubscription {
  id: string;
  userId: string;
  url: string;
  events: WebhookEventType[];
  isActive: boolean;
  secret: string;
  createdAt: number;
  updatedAt: number;
  description?: string;
  failureCount?: number;
  lastSuccess?: number;
  lastFailure?: number;
  filters?: {
    productIds?: string[];
    userIds?: string[];
    eventCategories?: string[];
  };
}

/**
 * Webhook event types
 */
export enum WebhookEventType {
  PRODUCT_CREATED = 'product.created',
  PRODUCT_UPDATED = 'product.updated',
  PRODUCT_TRANSFERRED = 'product.transferred',
  PRODUCT_STATUS_CHANGED = 'product.status_changed',
  PRODUCT_RECALLED = 'product.recalled',
  
  TRANSACTION_CREATED = 'transaction.created',
  TRANSACTION_CONFIRMED = 'transaction.confirmed',
  
  USER_CREATED = 'user.created',
  
  DISPUTE_OPENED = 'dispute.opened',
  DISPUTE_RESOLVED = 'dispute.resolved',
  
  BATCH_JOB_COMPLETED = 'batch_job.completed',
  BATCH_JOB_FAILED = 'batch_job.failed'
}

/**
 * Webhook event payload
 */
interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  createdAt: number;
  data: any;
}

/**
 * Webhook delivery record
 */
interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  url: string;
  timestamp: number;
  status: 'success' | 'failed';
  responseCode?: number;
  responseBody?: string;
  retryCount?: number;
}

/**
 * Service for managing webhook subscriptions and sending notifications
 */
class WebhookService {
  private static SUBSCRIPTION_KEY_PREFIX = 'webhook_subscription:';
  private static EVENT_KEY_PREFIX = 'webhook_event:';
  private static DELIVERY_KEY_PREFIX = 'webhook_delivery:';
  private static USER_WEBHOOKS_PREFIX = 'user_webhooks:';
  
  /**
   * Create a new webhook subscription
   * @param userId ID of the user creating the subscription
   * @param url URL to send webhook events to
   * @param events Array of event types to subscribe to
   * @param description Optional description
   * @param filters Optional filters for events
   * @returns The created webhook subscription
   */
  static async createSubscription(
    userId: string,
    url: string,
    events: WebhookEventType[],
    description?: string,
    filters?: WebhookSubscription['filters']
  ): Promise<WebhookSubscription> {
    // Validate URL
    if (!this.isValidUrl(url)) {
      throw new Error('Invalid webhook URL');
    }
    
    // Check if URL is accessible
    try {
      await axios.options(url, { timeout: 5000 });
    } catch (error) {
      console.warn(`Webhook URL ${url} might not be accessible:`, error);
      // We don't throw here, just warn - user might be testing or URL might be behind auth
    }
    
    // Create webhook subscription
    const id = uuidv4();
    const now = Date.now();
    const secret = this.generateWebhookSecret();
    
    const subscription: WebhookSubscription = {
      id,
      userId,
      url,
      events: events || [],
      isActive: true,
      secret,
      createdAt: now,
      updatedAt: now,
      description,
      failureCount: 0,
      filters
    };
    
    // Save subscription
    await this.saveSubscription(subscription);
    await this.addToUserIndex(userId, id);
    
    return subscription;
  }
  
  /**
   * Update an existing webhook subscription
   * @param id ID of the subscription to update
   * @param userId ID of the user making the update (for authorization)
   * @param updates Updates to apply
   * @returns The updated subscription
   */
  static async updateSubscription(
    id: string,
    userId: string,
    updates: Partial<Omit<WebhookSubscription, 'id' | 'userId' | 'createdAt' | 'secret'>>
  ): Promise<WebhookSubscription> {
    // Get existing subscription
    const subscription = await this.getSubscription(id);
    
    if (!subscription) {
      throw new Error(`Webhook subscription not found: ${id}`);
    }
    
    // Check authorization
    if (subscription.userId !== userId) {
      throw new Error('Not authorized to update this webhook subscription');
    }
    
    // Apply updates
    const updatedSubscription: WebhookSubscription = {
      ...subscription,
      ...updates,
      updatedAt: Date.now()
    };
    
    // Save updated subscription
    await this.saveSubscription(updatedSubscription);
    
    return updatedSubscription;
  }
  
  /**
   * Delete a webhook subscription
   * @param id ID of the subscription to delete
   * @param userId ID of the user making the deletion (for authorization)
   * @returns true if deleted, false otherwise
   */
  static async deleteSubscription(id: string, userId: string): Promise<boolean> {
    // Get existing subscription
    const subscription = await this.getSubscription(id);
    
    if (!subscription) {
      return false;
    }
    
    // Check authorization
    if (subscription.userId !== userId) {
      throw new Error('Not authorized to delete this webhook subscription');
    }
    
    // Delete subscription
    const key = this.SUBSCRIPTION_KEY_PREFIX + id;
    await txhashDB.del(key);
    
    // Remove from user index
    await this.removeFromUserIndex(userId, id);
    
    return true;
  }
  
  /**
   * Get a webhook subscription by ID
   * @param id ID of the subscription
   * @returns The subscription or null if not found
   */
  static async getSubscription(id: string): Promise<WebhookSubscription | null> {
    try {
      const key = this.SUBSCRIPTION_KEY_PREFIX + id;
      const data = await txhashDB.get(key);
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Get all webhook subscriptions for a user
   * @param userId ID of the user
   * @returns Array of subscriptions
   */
  static async getUserSubscriptions(userId: string): Promise<WebhookSubscription[]> {
    try {
      const userIndexKey = this.USER_WEBHOOKS_PREFIX + userId;
      let subscriptionIds: string[] = [];
      
      try {
        const indexData = await txhashDB.get(userIndexKey);
        subscriptionIds = JSON.parse(indexData);
      } catch (error) {
        return [];
      }
      
      const subscriptionPromises = subscriptionIds.map(id => this.getSubscription(id));
      const subscriptions = await Promise.all(subscriptionPromises);
      
      // Filter out any null values (deleted subscriptions)
      return subscriptions.filter(sub => sub !== null) as WebhookSubscription[];
    } catch (error) {
      console.error(`Error getting webhook subscriptions for user ${userId}:`, error);
      return [];
    }
  }
  
  /**
   * Trigger a webhook event
   * @param type Type of event
   * @param data Event data
   * @param filters Optional filters to apply (e.g., productId)
   */
  static async triggerEvent(
    type: WebhookEventType,
    data: any,
    filters: {
      productId?: string,
      userId?: string,
      category?: string
    } = {}
  ): Promise<void> {
    // Create event
    const eventId = uuidv4();
    const event: WebhookEvent = {
      id: eventId,
      type,
      createdAt: Date.now(),
      data
    };
    
    // Save event
    const eventKey = this.EVENT_KEY_PREFIX + eventId;
    await txhashDB.put(eventKey, JSON.stringify(event));
    
    // Find all active subscriptions for this event type
    const allSubscriptions = await this.findSubscriptionsForEvent(type, filters);
    
    // Send event to all matched subscriptions
    for (const subscription of allSubscriptions) {
      this.sendWebhook(subscription, event).catch(error => {
        console.error(`Error sending webhook to ${subscription.url}:`, error);
      });
    }
  }
  
  /**
   * Get delivery history for a webhook subscription
   * @param webhookId ID of the webhook subscription
   * @param limit Maximum number of deliveries to return
   * @param offset Offset for pagination
   * @returns Array of webhook deliveries
   */
  static async getDeliveryHistory(
    webhookId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<WebhookDelivery[]> {
    try {
      // This is a simple implementation that scans all deliveries
      // In a production system, you'd want to use an index
      const allKeys = await txhashDB.keys().all();
      const deliveryKeys = allKeys
        .filter(key => 
          key.toString().startsWith(this.DELIVERY_KEY_PREFIX) && 
          key.toString().includes(webhookId)
        )
        .slice(offset, offset + limit);
      
      const deliveryPromises = deliveryKeys.map(key => 
        txhashDB.get(key).then(data => JSON.parse(data))
      );
      
      const deliveries = await Promise.all(deliveryPromises);
      
      // Sort by timestamp descending (newest first)
      return deliveries.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error(`Error getting delivery history for webhook ${webhookId}:`, error);
      return [];
    }
  }
  
  /**
   * Regenerate the secret for a webhook subscription
   * @param id ID of the subscription
   * @param userId ID of the user making the request (for authorization)
   * @returns The new secret
   */
  static async regenerateSecret(id: string, userId: string): Promise<string> {
    // Get existing subscription
    const subscription = await this.getSubscription(id);
    
    if (!subscription) {
      throw new Error(`Webhook subscription not found: ${id}`);
    }
    
    // Check authorization
    if (subscription.userId !== userId) {
      throw new Error('Not authorized to update this webhook subscription');
    }
    
    // Generate new secret
    const newSecret = this.generateWebhookSecret();
    
    // Update subscription
    subscription.secret = newSecret;
    subscription.updatedAt = Date.now();
    
    // Save updated subscription
    await this.saveSubscription(subscription);
    
    return newSecret;
  }
  
  /**
   * Find all active subscriptions for an event type matching the filters
   * @param eventType Type of event
   * @param filters Filters to apply
   * @returns Array of matching subscriptions
   */
  private static async findSubscriptionsForEvent(
    eventType: WebhookEventType,
    filters: {
      productId?: string,
      userId?: string,
      category?: string
    } = {}
  ): Promise<WebhookSubscription[]> {
    try {
      // Get all subscription keys
      const allKeys = await txhashDB.keys().all();
      const subscriptionKeys = allKeys.filter(key => 
        key.toString().startsWith(this.SUBSCRIPTION_KEY_PREFIX)
      );
      
      // Get all subscriptions
      const subscriptionPromises = subscriptionKeys.map(key => 
        txhashDB.get(key).then(data => JSON.parse(data))
      );
      
      const allSubscriptions = await Promise.all(subscriptionPromises);
      
      // Filter subscriptions by event type and active status
      return allSubscriptions.filter(sub => {
        // Must be active
        if (!sub.isActive) {
          return false;
        }
        
        // Must be subscribed to this event type
        if (!sub.events.includes(eventType)) {
          return false;
        }
        
        // Apply custom filters if provided
        if (sub.filters) {
          // Filter by product ID
          if (filters.productId && sub.filters.productIds && 
              sub.filters.productIds.length > 0 && 
              !sub.filters.productIds.includes(filters.productId)) {
            return false;
          }
          
          // Filter by user ID
          if (filters.userId && sub.filters.userIds && 
              sub.filters.userIds.length > 0 && 
              !sub.filters.userIds.includes(filters.userId)) {
            return false;
          }
          
          // Filter by event category
          if (filters.category && sub.filters.eventCategories && 
              sub.filters.eventCategories.length > 0 && 
              !sub.filters.eventCategories.includes(filters.category)) {
            return false;
          }
        }
        
        return true;
      });
    } catch (error) {
      console.error(`Error finding subscriptions for event ${eventType}:`, error);
      return [];
    }
  }
  
  /**
   * Send a webhook to a subscription
   * @param subscription Subscription to send to
   * @param event Event to send
   */
  private static async sendWebhook(
    subscription: WebhookSubscription,
    event: WebhookEvent
  ): Promise<void> {
    const deliveryId = uuidv4();
    const timestamp = Date.now();
    
    // Create payload
    const payload = {
      id: event.id,
      type: event.type,
      created: event.createdAt,
      data: event.data
    };
    
    // Calculate signature (HMAC-SHA256)
    const signature = this.calculateSignature(payload, subscription.secret);
    
    try {
      // Send webhook
      const response = await axios.post(subscription.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-ID': subscription.id,
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event.type,
          'X-Webhook-Timestamp': timestamp.toString()
        },
        timeout: 10000 // 10 second timeout
      });
      
      // Record successful delivery
      const delivery: WebhookDelivery = {
        id: deliveryId,
        webhookId: subscription.id,
        eventId: event.id,
        url: subscription.url,
        timestamp,
        status: 'success',
        responseCode: response.status,
        responseBody: JSON.stringify(response.data).substring(0, 1000) // Limit response size
      };
      
      await this.saveDelivery(delivery);
      
      // Update subscription stats
      subscription.lastSuccess = timestamp;
      subscription.failureCount = 0;
      await this.saveSubscription(subscription);
    } catch (error) {
      // Record failed delivery
      const delivery: WebhookDelivery = {
        id: deliveryId,
        webhookId: subscription.id,
        eventId: event.id,
        url: subscription.url,
        timestamp,
        status: 'failed',
        responseCode: (error as any).response?.status,
        responseBody: (error as any).message
      };
      
      await this.saveDelivery(delivery);
      
      // Update subscription stats
      subscription.lastFailure = timestamp;
      subscription.failureCount = (subscription.failureCount || 0) + 1;
      
      // Disable webhook if too many failures
      if (subscription.failureCount >= 10) {
        subscription.isActive = false;
      }
      
      await this.saveSubscription(subscription);
      
      console.error(`Failed to send webhook to ${subscription.url}:`, (error as any).message);
    }
  }
  
  /**
   * Calculate signature for webhook payload
   * @param payload Webhook payload
   * @param secret Webhook secret
   * @returns HMAC-SHA256 signature
   */
  private static calculateSignature(payload: any, secret: string): string {
    // In a real implementation, you would use crypto.createHmac
    // For now, we'll return a placeholder
    return `sha256=${Date.now()}`; // Placeholder
  }
  
  /**
   * Generate a random webhook secret
   * @returns Random secret
   */
  private static generateWebhookSecret(): string {
    return uuidv4() + uuidv4().replace(/-/g, '');
  }
  
  /**
   * Save a webhook subscription
   * @param subscription Subscription to save
   */
  private static async saveSubscription(subscription: WebhookSubscription): Promise<void> {
    const key = this.SUBSCRIPTION_KEY_PREFIX + subscription.id;
    await txhashDB.put(key, JSON.stringify(subscription));
  }
  
  /**
   * Save a webhook delivery record
   * @param delivery Delivery to save
   */
  private static async saveDelivery(delivery: WebhookDelivery): Promise<void> {
    const key = `${this.DELIVERY_KEY_PREFIX}${delivery.webhookId}:${delivery.id}`;
    await txhashDB.put(key, JSON.stringify(delivery));
  }
  
  /**
   * Add a webhook ID to a user's index
   * @param userId User ID
   * @param webhookId Webhook ID
   */
  private static async addToUserIndex(userId: string, webhookId: string): Promise<void> {
    const indexKey = this.USER_WEBHOOKS_PREFIX + userId;
    let subscriptionIds: string[] = [];
    
    try {
      const indexData = await txhashDB.get(indexKey);
      subscriptionIds = JSON.parse(indexData);
    } catch (error) {
      // Index doesn't exist yet, create it
    }
    
    // Add webhook ID if not already present
    if (!subscriptionIds.includes(webhookId)) {
      subscriptionIds.push(webhookId);
      await txhashDB.put(indexKey, JSON.stringify(subscriptionIds));
    }
  }
  
  /**
   * Remove a webhook ID from a user's index
   * @param userId User ID
   * @param webhookId Webhook ID
   */
  private static async removeFromUserIndex(userId: string, webhookId: string): Promise<void> {
    const indexKey = this.USER_WEBHOOKS_PREFIX + userId;
    
    try {
      const indexData = await txhashDB.get(indexKey);
      let subscriptionIds = JSON.parse(indexData);
      
      // Remove webhook ID
      subscriptionIds = subscriptionIds.filter((id: string) => id !== webhookId);
      
      // Save updated index
      await txhashDB.put(indexKey, JSON.stringify(subscriptionIds));
    } catch (error) {
      // Index doesn't exist, nothing to do
    }
  }
  
  /**
   * Validate a URL
   * @param url URL to validate
   * @returns true if valid, false otherwise
   */
  private static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }
}

export default WebhookService; 