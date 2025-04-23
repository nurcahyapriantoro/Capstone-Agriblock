import { Request, Response } from 'express';
import DisputeResolutionService from '../../core/DisputeResolutionService';
import { DisputeType, DisputeResolution } from '../../enum';
import { logger } from '../../utils/logger';

/**
 * Create a new dispute
 */
export const createDispute = async (req: Request, res: Response) => {
  try {
    const {
      productId,
      transactionId,
      complainantId,
      respondentId,
      type,
      description,
      evidence = []
    } = req.body;

    // Validate required fields
    if (!productId || !transactionId || !complainantId || !respondentId || !type || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate dispute type
    if (!Object.values(DisputeType).includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dispute type'
      });
    }

    const result = await DisputeResolutionService.createDispute(
      productId,
      transactionId,
      complainantId,
      respondentId,
      type,
      description,
      evidence
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    return res.status(201).json({
      success: true,
      disputeId: result.disputeId,
      message: 'Dispute created successfully'
    });
  } catch (error) {
    logger.error('Error creating dispute:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create dispute'
    });
  }
};

/**
 * Get dispute by ID
 */
export const getDisputeById = async (req: Request, res: Response) => {
  try {
    const { disputeId } = req.params;

    if (!disputeId) {
      return res.status(400).json({
        success: false,
        message: 'Dispute ID is required'
      });
    }

    const dispute = await DisputeResolutionService.getDispute(disputeId);

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }

    return res.status(200).json({
      success: true,
      dispute
    });
  } catch (error) {
    logger.error('Error fetching dispute:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dispute'
    });
  }
};

/**
 * Get disputes by product ID
 */
export const getDisputesByProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    const disputes = await DisputeResolutionService.getDisputesByProduct(productId);

    return res.status(200).json({
      success: true,
      disputes
    });
  } catch (error) {
    logger.error('Error fetching disputes by product:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch disputes'
    });
  }
};

/**
 * Get disputes by user ID
 */
export const getDisputesByUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const disputes = await DisputeResolutionService.getDisputesByUser(userId);

    return res.status(200).json({
      success: true,
      disputes
    });
  } catch (error) {
    logger.error('Error fetching disputes by user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch disputes'
    });
  }
};

/**
 * Assign mediator to a dispute
 */
export const assignMediator = async (req: Request, res: Response) => {
  try {
    const { disputeId, mediatorId } = req.body;

    if (!disputeId || !mediatorId) {
      return res.status(400).json({
        success: false,
        message: 'Dispute ID and Mediator ID are required'
      });
    }

    const result = await DisputeResolutionService.assignMediator(disputeId, mediatorId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Mediator assigned successfully'
    });
  } catch (error) {
    logger.error('Error assigning mediator:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign mediator'
    });
  }
};

/**
 * Resolve a dispute
 */
export const resolveDispute = async (req: Request, res: Response) => {
  try {
    const { 
      disputeId, 
      resolverId, 
      resolutionType, 
      description, 
      compensation 
    } = req.body;

    if (!disputeId || !resolverId || !resolutionType || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Validate resolution type
    if (!Object.values(DisputeResolution).includes(resolutionType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resolution type'
      });
    }

    const result = await DisputeResolutionService.resolveDispute(
      disputeId,
      resolverId,
      {
        type: resolutionType,
        description,
        compensation
      }
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Dispute resolved successfully'
    });
  } catch (error) {
    logger.error('Error resolving dispute:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve dispute'
    });
  }
}; 