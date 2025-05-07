import { Request, Response } from 'express';
import { NotificationService } from '../../services/NotificationService';

/**
 * Get notifications for a user
 */
export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const includeRead = req.query.includeRead === 'true';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }
    
    const notifications = await NotificationService.getUserNotifications(
      userId,
      includeRead,
      limit
    );
    
    return res.status(200).json({
      success: true,
      data: {
        notifications,
        count: notifications.length,
        unreadCount: notifications.filter(n => !n.read).length
      }
    });
  } catch (error) {
    console.error("Error getting notifications:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get notifications"
    });
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const { userId, notificationId } = req.params;
    
    if (!userId || !notificationId) {
      return res.status(400).json({
        success: false,
        message: "User ID and notification ID are required"
      });
    }
    
    const success = await NotificationService.markNotificationAsRead(
      userId,
      notificationId
    );
    
    if (success) {
      return res.status(200).json({
        success: true,
        message: "Notification marked as read"
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Notification not found or could not be updated"
      });
    }
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark notification as read"
    });
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }
    
    const count = await NotificationService.markAllNotificationsAsRead(userId);
    
    return res.status(200).json({
      success: true,
      message: `${count} notifications marked as read`,
      data: { count }
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read"
    });
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }
    
    const count = await NotificationService.getUnreadCount(userId);
    
    return res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error("Error getting unread count:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get unread count"
    });
  }
}; 