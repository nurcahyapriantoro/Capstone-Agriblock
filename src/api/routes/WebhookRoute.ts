import express, { Request, Response } from "express";
import { authenticateJWT } from "../../middleware/auth";
import { ErrorCode, sendErrorResponse } from "../../utils/errorHandler";
import { Joi, validate } from "express-validation";
import { WebhookEventType } from "../../services/WebhookService";

const router = express.Router();

/**
 * @swagger
 * /webhook:
 *   post:
 *     summary: Create a new webhook subscription
 *     tags: [Webhooks]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *               - events
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: URL to send webhook events to
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [product.created, product.updated, product.transferred, product.status_changed, product.recalled, transaction.created, transaction.confirmed, user.created, dispute.opened, dispute.resolved, batch_job.completed, batch_job.failed]
 *                 description: Event types to subscribe to
 *               description:
 *                 type: string
 *                 description: Optional description for the webhook
 *               filters:
 *                 type: object
 *                 properties:
 *                   productIds:
 *                     type: array
 *                     items:
 *                       type: string
 *                   userIds:
 *                     type: array
 *                     items:
 *                       type: string
 *                   eventCategories:
 *                     type: array
 *                     items:
 *                       type: string
 *     responses:
 *       201:
 *         description: Webhook subscription created
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post("/", 
  authenticateJWT,
  validate({
    body: Joi.object({
      url: Joi.string().uri().required(),
      events: Joi.array().items(
        Joi.string().valid(...Object.values(WebhookEventType))
      ).min(1).required(),
      description: Joi.string(),
      filters: Joi.object({
        productIds: Joi.array().items(Joi.string()),
        userIds: Joi.array().items(Joi.string()),
        eventCategories: Joi.array().items(Joi.string())
      })
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return sendErrorResponse(
          res,
          ErrorCode.UNAUTHORIZED,
          "User ID not found in request"
        );
      }

      const { url, events, description, filters } = req.body;

      // Import WebhookService
      const WebhookService = (await import("../../services/WebhookService")).default;
      
      // Create webhook subscription
      const subscription = await WebhookService.createSubscription(
        userId,
        url,
        events,
        description,
        filters
      );

      return res.status(201).json({
        success: true,
        data: {
          subscription: {
            id: subscription.id,
            url: subscription.url,
            events: subscription.events,
            isActive: subscription.isActive,
            createdAt: subscription.createdAt,
            description: subscription.description,
            filters: subscription.filters
          },
          secret: subscription.secret // Include secret in the response
        },
        message: "Webhook subscription created successfully"
      });
    } catch (error) {
      console.error("Error creating webhook subscription:", error);
      return sendErrorResponse(
        res,
        ErrorCode.GENERAL_ERROR,
        "Error creating webhook subscription",
        error instanceof Error ? error.message : undefined
      );
    }
  }
);

/**
 * @swagger
 * /webhook:
 *   get:
 *     summary: Get all webhook subscriptions for the current user
 *     tags: [Webhooks]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User's webhook subscriptions
 *       401:
 *         description: Unauthorized
 */
router.get("/", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return sendErrorResponse(
        res,
        ErrorCode.UNAUTHORIZED,
        "User ID not found in request"
      );
    }

    // Import WebhookService
    const WebhookService = (await import("../../services/WebhookService")).default;
    
    // Get user's webhook subscriptions
    const subscriptions = await WebhookService.getUserSubscriptions(userId);

    return res.status(200).json({
      success: true,
      data: {
        subscriptions: subscriptions.map(sub => ({
          id: sub.id,
          url: sub.url,
          events: sub.events,
          isActive: sub.isActive,
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt,
          description: sub.description,
          filters: sub.filters,
          lastSuccess: sub.lastSuccess,
          lastFailure: sub.lastFailure,
          failureCount: sub.failureCount
        })),
        count: subscriptions.length
      }
    });
  } catch (error) {
    console.error("Error getting webhook subscriptions:", error);
    return sendErrorResponse(
      res,
      ErrorCode.GENERAL_ERROR,
      "Error retrieving webhook subscriptions",
      error instanceof Error ? error.message : undefined
    );
  }
});

/**
 * @swagger
 * /webhook/{webhookId}:
 *   put:
 *     summary: Update a webhook subscription
 *     tags: [Webhooks]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: webhookId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the webhook
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [product.created, product.updated, product.transferred, product.status_changed, product.recalled, transaction.created, transaction.confirmed, user.created, dispute.opened, dispute.resolved, batch_job.completed, batch_job.failed]
 *               isActive:
 *                 type: boolean
 *               description:
 *                 type: string
 *               filters:
 *                 type: object
 *                 properties:
 *                   productIds:
 *                     type: array
 *                     items:
 *                       type: string
 *                   userIds:
 *                     type: array
 *                     items:
 *                       type: string
 *                   eventCategories:
 *                     type: array
 *                     items:
 *                       type: string
 *     responses:
 *       200:
 *         description: Webhook subscription updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not the subscription owner
 *       404:
 *         description: Webhook subscription not found
 */
router.put("/:webhookId", 
  authenticateJWT,
  validate({
    body: Joi.object({
      url: Joi.string().uri(),
      events: Joi.array().items(
        Joi.string().valid(...Object.values(WebhookEventType))
      ),
      isActive: Joi.boolean(),
      description: Joi.string(),
      filters: Joi.object({
        productIds: Joi.array().items(Joi.string()),
        userIds: Joi.array().items(Joi.string()),
        eventCategories: Joi.array().items(Joi.string())
      })
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { webhookId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return sendErrorResponse(
          res,
          ErrorCode.UNAUTHORIZED,
          "User ID not found in request"
        );
      }

      // Import WebhookService
      const WebhookService = (await import("../../services/WebhookService")).default;
      
      // Update webhook subscription
      try {
        const updatedSubscription = await WebhookService.updateSubscription(
          webhookId,
          userId,
          req.body
        );

        return res.status(200).json({
          success: true,
          data: {
            subscription: {
              id: updatedSubscription.id,
              url: updatedSubscription.url,
              events: updatedSubscription.events,
              isActive: updatedSubscription.isActive,
              createdAt: updatedSubscription.createdAt,
              updatedAt: updatedSubscription.updatedAt,
              description: updatedSubscription.description,
              filters: updatedSubscription.filters
            }
          },
          message: "Webhook subscription updated successfully"
        });
      } catch (error) {
        if ((error as Error).message.includes('not found')) {
          return sendErrorResponse(
            res,
            ErrorCode.NOT_FOUND,
            `Webhook subscription with ID ${webhookId} not found`
          );
        } else if ((error as Error).message.includes('Not authorized')) {
          return sendErrorResponse(
            res,
            ErrorCode.FORBIDDEN,
            "You are not authorized to update this webhook subscription"
          );
        }
        throw error;
      }
    } catch (error) {
      console.error("Error updating webhook subscription:", error);
      return sendErrorResponse(
        res,
        ErrorCode.GENERAL_ERROR,
        "Error updating webhook subscription",
        error instanceof Error ? error.message : undefined
      );
    }
  }
);

/**
 * @swagger
 * /webhook/{webhookId}:
 *   delete:
 *     summary: Delete a webhook subscription
 *     tags: [Webhooks]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: webhookId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the webhook
 *     responses:
 *       200:
 *         description: Webhook subscription deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not the subscription owner
 *       404:
 *         description: Webhook subscription not found
 */
router.delete("/:webhookId", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { webhookId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return sendErrorResponse(
        res,
        ErrorCode.UNAUTHORIZED,
        "User ID not found in request"
      );
    }

    // Import WebhookService
    const WebhookService = (await import("../../services/WebhookService")).default;
    
    // Delete webhook subscription
    try {
      const deleted = await WebhookService.deleteSubscription(webhookId, userId);

      if (!deleted) {
        return sendErrorResponse(
          res,
          ErrorCode.NOT_FOUND,
          `Webhook subscription with ID ${webhookId} not found`
        );
      }

      return res.status(200).json({
        success: true,
        message: "Webhook subscription deleted successfully"
      });
    } catch (error) {
      if ((error as Error).message.includes('Not authorized')) {
        return sendErrorResponse(
          res,
          ErrorCode.FORBIDDEN,
          "You are not authorized to delete this webhook subscription"
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Error deleting webhook subscription:", error);
    return sendErrorResponse(
      res,
      ErrorCode.GENERAL_ERROR,
      "Error deleting webhook subscription",
      error instanceof Error ? error.message : undefined
    );
  }
});

/**
 * @swagger
 * /webhook/{webhookId}/regenerate-secret:
 *   post:
 *     summary: Regenerate the secret for a webhook subscription
 *     tags: [Webhooks]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: webhookId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the webhook
 *     responses:
 *       200:
 *         description: Secret regenerated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not the subscription owner
 *       404:
 *         description: Webhook subscription not found
 */
router.post("/:webhookId/regenerate-secret", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { webhookId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return sendErrorResponse(
        res,
        ErrorCode.UNAUTHORIZED,
        "User ID not found in request"
      );
    }

    // Import WebhookService
    const WebhookService = (await import("../../services/WebhookService")).default;
    
    // Regenerate webhook secret
    try {
      const newSecret = await WebhookService.regenerateSecret(webhookId, userId);

      return res.status(200).json({
        success: true,
        data: {
          webhookId,
          secret: newSecret
        },
        message: "Webhook secret regenerated successfully"
      });
    } catch (error) {
      if ((error as Error).message.includes('not found')) {
        return sendErrorResponse(
          res,
          ErrorCode.NOT_FOUND,
          `Webhook subscription with ID ${webhookId} not found`
        );
      } else if ((error as Error).message.includes('Not authorized')) {
        return sendErrorResponse(
          res,
          ErrorCode.FORBIDDEN,
          "You are not authorized to regenerate the secret for this webhook subscription"
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Error regenerating webhook secret:", error);
    return sendErrorResponse(
      res,
      ErrorCode.GENERAL_ERROR,
      "Error regenerating webhook secret",
      error instanceof Error ? error.message : undefined
    );
  }
});

/**
 * @swagger
 * /webhook/{webhookId}/deliveries:
 *   get:
 *     summary: Get delivery history for a webhook subscription
 *     tags: [Webhooks]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: webhookId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the webhook
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of deliveries per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Offset for pagination
 *     responses:
 *       200:
 *         description: Webhook delivery history
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not the subscription owner
 *       404:
 *         description: Webhook subscription not found
 */
router.get("/:webhookId/deliveries", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { webhookId } = req.params;
    const userId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!userId) {
      return sendErrorResponse(
        res,
        ErrorCode.UNAUTHORIZED,
        "User ID not found in request"
      );
    }

    // Import WebhookService
    const WebhookService = (await import("../../services/WebhookService")).default;
    
    // Check if webhook exists and user is authorized
    const subscription = await WebhookService.getSubscription(webhookId);
    
    if (!subscription) {
      return sendErrorResponse(
        res,
        ErrorCode.NOT_FOUND,
        `Webhook subscription with ID ${webhookId} not found`
      );
    }
    
    if (subscription.userId !== userId) {
      return sendErrorResponse(
        res,
        ErrorCode.FORBIDDEN,
        "You are not authorized to view deliveries for this webhook subscription"
      );
    }
    
    // Get delivery history
    const deliveries = await WebhookService.getDeliveryHistory(webhookId, limit, offset);

    return res.status(200).json({
      success: true,
      data: {
        webhookId,
        deliveries,
        count: deliveries.length
      }
    });
  } catch (error) {
    console.error("Error getting webhook delivery history:", error);
    return sendErrorResponse(
      res,
      ErrorCode.GENERAL_ERROR,
      "Error retrieving webhook delivery history",
      error instanceof Error ? error.message : undefined
    );
  }
});

export default router; 