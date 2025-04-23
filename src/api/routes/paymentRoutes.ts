import express from "express";
import PaymentManagementController from "../controller/PaymentManagementController";

const router = express.Router();

// Define payment routes
router.post("/create", PaymentManagementController.createPayment);
router.get("/history/:productId", PaymentManagementController.getPaymentHistory);
router.get("/total/:productId", PaymentManagementController.getTotalPayments);
router.get("/user-payments/:productId", PaymentManagementController.getUserPayments);
router.get("/received-payments/:productId", PaymentManagementController.getUserReceivedPayments);

export default router; 