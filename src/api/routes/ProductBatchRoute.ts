import express, { Request, Response } from "express";
import { authenticateJWT } from "../../middleware/auth";
import { UserRole } from "../../enum";
import { ErrorCode, sendErrorResponse } from "../../utils/errorHandler";
import { Joi, validate } from "express-validation";

const router = express.Router();

// Helper function to check if user is a farmer
const isFarmer = (req: Request): boolean => {
  return req.user?.role === UserRole.FARMER;
};

// Middleware to ensure only farmers can perform batch operations
const ensureFarmerAccess = (req: Request, res: Response, next: Function) => {
  if (!isFarmer(req)) {
    return sendErrorResponse(
      res,
      ErrorCode.UNAUTHORIZED_ROLE,
      "Access denied. Only farmers can perform batch product operations."
    );
  }
  next();
};

/**
 * @swagger
 * /product/batch/create:
 *   post:
 *     summary: Create multiple products in a batch operation
 *     tags: [Products, Batch Operations]
 *     security:
 *       - BearerAuth: []
 *     description: Create multiple products at once
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - products
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     price:
 *                       type: number
 *                     category:
 *                       type: string
 *                     metadata:
 *                       type: object
 *               runAsync:
 *                 type: boolean
 *                 description: If true, the operation will run in the background
 *     responses:
 *       200:
 *         description: Successful batch creation
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not a farmer
 */
router.post("/batch/create", 
  authenticateJWT, 
  ensureFarmerAccess,
  validate({
    body: Joi.object({
      products: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          description: Joi.string(),
          quantity: Joi.number().min(0),
          price: Joi.number().min(0),
          category: Joi.string(),
          metadata: Joi.object()
        })
      ).min(1).required(),
      runAsync: Joi.boolean()
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { products, runAsync = false } = req.body;
      const farmerId = req.user?.id;

      if (!farmerId) {
        return sendErrorResponse(
          res,
          ErrorCode.UNAUTHORIZED,
          "User ID not found in request"
        );
      }

      // Import BatchOperationsService
      const BatchOperationsService = (await import("../../services/BatchOperationsService")).default;
      
      // Create products in batch
      const result = await BatchOperationsService.createProducts(
        farmerId,
        products,
        { userId: farmerId, runAsync }
      );

      // If running asynchronously, return the batch ID
      if (runAsync) {
        return res.status(202).json({
          success: true,
          message: "Batch product creation started",
          data: {
            batchId: result
          }
        });
      }

      // Otherwise, return the full result
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Error in batch product creation:", error);
      return sendErrorResponse(
        res,
        ErrorCode.BATCH_JOB_FAILED,
        "Error creating products in batch",
        error instanceof Error ? error.message : undefined
      );
    }
  }
);

/**
 * @swagger
 * /product/batch/update:
 *   post:
 *     summary: Update multiple products in a batch operation
 *     tags: [Products, Batch Operations]
 *     security:
 *       - BearerAuth: []
 *     description: Update multiple products at once
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - products
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - updates
 *                   properties:
 *                     id:
 *                       type: string
 *                     updates:
 *                       type: object
 *               runAsync:
 *                 type: boolean
 *                 description: If true, the operation will run in the background
 *     responses:
 *       200:
 *         description: Successful batch update
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not the product owner
 */
router.post("/batch/update", 
  authenticateJWT,
  validate({
    body: Joi.object({
      products: Joi.array().items(
        Joi.object({
          id: Joi.string().required(),
          updates: Joi.object().required()
        })
      ).min(1).required(),
      runAsync: Joi.boolean()
    })
  }),
  async (req: Request, res: Response) => {
    try {
      const { products, runAsync = false } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return sendErrorResponse(
          res,
          ErrorCode.UNAUTHORIZED,
          "User ID not found in request"
        );
      }

      // Import BatchOperationsService
      const BatchOperationsService = (await import("../../services/BatchOperationsService")).default;
      
      // Update products in batch
      const result = await BatchOperationsService.updateProducts(
        products,
        { userId, runAsync }
      );

      // If running asynchronously, return the batch ID
      if (runAsync) {
        return res.status(202).json({
          success: true,
          message: "Batch product update started",
          data: {
            batchId: result
          }
        });
      }

      // Otherwise, return the full result
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Error in batch product update:", error);
      return sendErrorResponse(
        res,
        ErrorCode.BATCH_JOB_FAILED,
        "Error updating products in batch",
        error instanceof Error ? error.message : undefined
      );
    }
  }
);

/**
 * @swagger
 * /product/batch/{batchId}:
 *   get:
 *     summary: Get the status of a batch job
 *     tags: [Products, Batch Operations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: batchId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the batch job
 *     responses:
 *       200:
 *         description: Batch job status
 *       404:
 *         description: Batch job not found
 */
router.get("/batch/:batchId", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return sendErrorResponse(
        res,
        ErrorCode.UNAUTHORIZED,
        "User ID not found in request"
      );
    }

    // Import BatchOperationsService
    const BatchOperationsService = (await import("../../services/BatchOperationsService")).default;
    
    // Get batch job status
    const status = await BatchOperationsService.getBatchJobStatus(batchId);

    if (!status) {
      return sendErrorResponse(
        res,
        ErrorCode.BATCH_JOB_NOT_FOUND,
        `Batch job with ID ${batchId} not found`
      );
    }

    // Only the user who created the job can view it
    if (status.userId !== userId) {
      return sendErrorResponse(
        res,
        ErrorCode.FORBIDDEN,
        "You do not have permission to view this batch job"
      );
    }

    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error("Error getting batch job status:", error);
    return sendErrorResponse(
      res,
      ErrorCode.GENERAL_ERROR,
      "Error retrieving batch job status",
      error instanceof Error ? error.message : undefined
    );
  }
});

/**
 * @swagger
 * /product/batch/user:
 *   get:
 *     summary: Get all batch jobs for the current user
 *     tags: [Products, Batch Operations]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User's batch jobs
 */
router.get("/batch/user", authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return sendErrorResponse(
        res,
        ErrorCode.UNAUTHORIZED,
        "User ID not found in request"
      );
    }

    // Import BatchOperationsService
    const BatchOperationsService = (await import("../../services/BatchOperationsService")).default;
    
    // Get user's batch jobs
    const jobs = await BatchOperationsService.getUserBatchJobs(userId);

    return res.status(200).json({
      success: true,
      data: {
        jobs,
        count: jobs.length
      }
    });
  } catch (error) {
    console.error("Error getting user batch jobs:", error);
    return sendErrorResponse(
      res,
      ErrorCode.GENERAL_ERROR,
      "Error retrieving user batch jobs",
      error instanceof Error ? error.message : undefined
    );
  }
});

export default router; 