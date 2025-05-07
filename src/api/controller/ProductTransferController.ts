import { Request, Response } from "express";
import { transferOwnership } from "./ProductController";
import ProductManagementController from "./ProductManagementController";
import { container } from 'tsyringe';
import { UserRole, ProductStatus } from '../../enum';
import RoleService from '../../core/RoleService';

/**
 * Controller for handling product transfer operations
 */
export default class ProductTransferController {
  /**
   * Transfer product ownership and automatically update status
   */
  static transferProduct = async (req: Request, res: Response) => {
    try {
      // Get instance of ProductManagementController
      const productManagementController = container.resolve(ProductManagementController);
      
      // Extract request data
      const { productId, fromUserId, toUserId, details } = req.body;
      const userId = req.user?.id;

      // Validate basic data
      if (!productId || !fromUserId || !toUserId) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameters: productId, fromUserId, and toUserId are required"
        });
      }

      // Ensure authenticated user is the current product owner
      if (userId !== fromUserId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You can only transfer products you own"
        });
      }

      // Get roles of sender and receiver to determine automatic status update
      let fromUserRole: UserRole | null = null;
      let toUserRole: UserRole | null = null;
      
      try {
        fromUserRole = await RoleService.getUserRole(fromUserId);
        toUserRole = await RoleService.getUserRole(toUserId);
      } catch (error) {
        console.warn("Could not determine user roles for transfer:", error);
      }

      // 1. Transfer product ownership first
      const transferResult = await transferOwnership(req, res);
      
      // If response has already been sent (error), stop here
      if (res.headersSent) {
        return;
      }
      
      // 2. Perubahan utama: Selalu otomatis terima produk untuk semua transfer antar role
      // Sebelumnya hanya untuk FARMER -> COLLECTOR, sekarang untuk semua transfer
      const shouldAutoReceive = true; // Ubah ke true untuk semua transfer
      
      // Prepare updated details with transfer information
      const updatedDetails = {
        ...details,
        previousOwner: fromUserId,
        transferTime: new Date().toISOString(),
        autoReceived: shouldAutoReceive,
        fromRole: fromUserRole,
        toRole: toUserRole
      };

      // Jika auto-receive diaktifkan, langsung perbarui status ke RECEIVED
      if (shouldAutoReceive) {
        console.log(`Auto-receiving product ${productId} transferred from ${fromUserRole} to ${toUserRole}`);
        
        // Modified request for auto-receive with receiver as actor
        req.body = {
          productId,
          targetUserId: toUserId,
          details: {
            ...updatedDetails,
            receivedQuantity: details?.quantity || 100, // Use provided quantity or default
            receivedDate: new Date().toISOString(),
            receivedBy: "Auto Received", 
            location: details?.location || "Transfer Location",
            condition: details?.condition || "Good",
            notes: `Product automatically received upon transfer from ${fromUserRole} to ${toUserRole}`
          }
        };
        
        // Use the user ID of the receiver as the actor for the receive operation
        // This is crucial for permission checks in the ProductManagementController
        const originalUser = req.user;
        
        // Ensure toUserRole is not null before assigning, default to string representation if needed
        req.user = { 
          id: toUserId, 
          role: toUserRole ? toUserRole : UserRole.COLLECTOR 
        };
        
        // Call the receiveProduct method directly - product will be auto-received
        return productManagementController.receiveProduct(req, res);
      } else {
        // For other transfers, update status to TRANSFERRED as before
        req.body = {
          productId,
          targetUserId: toUserId,
          details: updatedDetails
        };
        
        return productManagementController.transferProduct(req, res);
      }
    } catch (error) {
      console.error("Error in transfer product:", error);
      return res.status(500).json({
        success: false,
        message: `Error transferring product: ${(error as Error).message}`
      });
    }
  }
}