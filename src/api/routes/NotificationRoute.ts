import express from "express";
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  getUnreadCount
} from "../controller/NotificationController";

const router = express.Router();

/**
 * @swagger
 * /notifications/{userId}:
 *   get:
 *     summary: Get user notifications
 *     description: Get notifications for a specific user
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: query
 *         name: includeRead
 *         schema:
 *           type: boolean
 *         description: Whether to include read notifications (default false)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of notifications to return (default 50)
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *       400:
 *         description: Invalid request
 */
router.get("/:userId", getUserNotifications);

/**
 * @swagger
 * /notifications/{userId}/unread:
 *   get:
 *     summary: Get unread notification count
 *     description: Get count of unread notifications for a user
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *       400:
 *         description: Invalid request
 */
router.get("/:userId/unread", getUnreadCount);

/**
 * @swagger
 * /notifications/{userId}/{notificationId}:
 *   post:
 *     summary: Mark notification as read
 *     description: Mark a specific notification as read
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Notification not found
 */
router.post("/:userId/:notificationId", markNotificationAsRead);

/**
 * @swagger
 * /notifications/{userId}/read-all:
 *   post:
 *     summary: Mark all notifications as read
 *     description: Mark all notifications for a user as read
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       400:
 *         description: Invalid request
 */
router.post("/:userId/read-all", markAllNotificationsAsRead);

export default router; 