import { txhashDB } from '../helper/level.db.client';

/**
 * Notification type enumeration
 */
export enum NotificationType {
  PRODUCT_CREATED = 'PRODUCT_CREATED',
  PRODUCT_UPDATED = 'PRODUCT_UPDATED',
  PRODUCT_TRANSFERRED = 'PRODUCT_TRANSFERRED',
  PRODUCT_RECALLED = 'PRODUCT_RECALLED',
  TRANSACTION_COMPLETED = 'TRANSACTION_COMPLETED',
  VERIFICATION_COMPLETED = 'VERIFICATION_COMPLETED',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  QUALITY_VERIFICATION_REQUEST = 'QUALITY_VERIFICATION_REQUEST',
  VERIFICATION_NEEDED = 'VERIFICATION_NEEDED'
}

/**
 * Notification data interface
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  read: boolean;
  createdAt: number;
}

/**
 * Service for managing and sending notifications to users
 */
export class NotificationService {
  /**
   * Send notification to a user
   * @param userId User ID to send notification to
   * @param message Notification message
   * @param type Notification type
   * @param metadata Additional notification data
   * @returns Success status
   */
  static async sendNotification(
    userId: string, 
    title: string,
    message: string, 
    type: NotificationType,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      console.log(`NOTIFICATION to ${userId}: ${message} [${type}]`);
      
      // Create notification object
      const notification: Notification = {
        id: `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        userId,
        type,
        title,
        message,
        metadata,
        read: false,
        createdAt: Date.now()
      };
      
      // Store notification in database
      await txhashDB.put(`notification:${userId}:${notification.id}`, JSON.stringify(notification));
      
      // If this were a production system, here you would:
      // 1. Send email notification if configured
      // 2. Send SMS notification if configured
      // 3. Send push notification if configured
      // 4. Update unread count in user's profile
      
      return true;
    } catch (error) {
      console.error(`Failed to send notification to ${userId}:`, error);
      return false;
    }
  }
  
  /**
   * Get all notifications for a user
   * @param userId User ID to get notifications for
   * @param includeRead Whether to include read notifications
   * @param limit Maximum number of notifications to return
   * @returns List of notifications
   */
  static async getUserNotifications(
    userId: string,
    includeRead: boolean = true,
    limit: number = 50
  ): Promise<Notification[]> {
    try {
      // Get all notification keys for this user
      const prefix = `notification:${userId}:`;
      const keys = await txhashDB.keys({ gt: prefix, lt: prefix + '\uffff' }).all();
      
      // Load all notifications
      const notifications: Notification[] = [];
      let count = 0;
      
      for (const key of keys) {
        if (count >= limit) break;
        
        const notificationData = await txhashDB.get(key.toString());
        const notification: Notification = JSON.parse(notificationData);
        
        // Filter out read notifications if requested
        if (!includeRead && notification.read) continue;
        
        notifications.push(notification);
        count++;
      }
      
      // Sort by creation time (newest first)
      return notifications.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error(`Failed to get notifications for ${userId}:`, error);
      return [];
    }
  }
  
  /**
   * Mark a notification as read
   * @param userId User ID who owns the notification
   * @param notificationId ID of the notification to mark as read
   * @returns Success status
   */
  static async markNotificationAsRead(
    userId: string,
    notificationId: string
  ): Promise<boolean> {
    try {
      const key = `notification:${userId}:${notificationId}`;
      
      // Read the notification
      const notificationData = await txhashDB.get(key);
      const notification: Notification = JSON.parse(notificationData);
      
      // Update read status
      notification.read = true;
      
      // Save back to database
      await txhashDB.put(key, JSON.stringify(notification));
      
      return true;
    } catch (error) {
      console.error(`Failed to mark notification ${notificationId} as read:`, error);
      return false;
    }
  }
  
  /**
   * Mark all notifications for a user as read
   * @param userId User ID to mark all notifications as read
   * @returns Number of notifications marked as read
   */
  static async markAllNotificationsAsRead(userId: string): Promise<number> {
    try {
      // Get all notification keys for this user
      const prefix = `notification:${userId}:`;
      const keys = await txhashDB.keys({ gt: prefix, lt: prefix + '\uffff' }).all();
      
      let count = 0;
      
      for (const key of keys) {
        const notificationData = await txhashDB.get(key.toString());
        const notification: Notification = JSON.parse(notificationData);
        
        // Skip already read notifications
        if (notification.read) continue;
        
        // Update read status
        notification.read = true;
        
        // Save back to database
        await txhashDB.put(key.toString(), JSON.stringify(notification));
        
        count++;
      }
      
      return count;
    } catch (error) {
      console.error(`Failed to mark all notifications as read for ${userId}:`, error);
      return 0;
    }
  }
  
  /**
   * Get unread notification count for a user
   * @param userId User ID to get unread count for
   * @returns Number of unread notifications
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      // Get all notifications for this user
      const notifications = await this.getUserNotifications(userId, true);
      
      // Count unread notifications
      return notifications.filter(n => !n.read).length;
    } catch (error) {
      console.error(`Failed to get unread count for ${userId}:`, error);
      return 0;
    }
  }
  
  /**
   * Send notification to multiple users
   * @param userIds Array of user IDs to send notification to
   * @param title Notification title
   * @param message Notification message
   * @param type Notification type
   * @param metadata Additional notification data
   * @returns Number of successful notifications
   */
  static async sendBulkNotification(
    userIds: string[],
    title: string,
    message: string,
    type: NotificationType,
    metadata?: Record<string, any>
  ): Promise<number> {
    let successCount = 0;
    
    for (const userId of userIds) {
      const success = await this.sendNotification(userId, title, message, type, metadata);
      if (success) successCount++;
    }
    
    return successCount;
  }
}