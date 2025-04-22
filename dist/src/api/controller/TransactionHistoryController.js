"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserTransactionHistory = exports.getProductTransactionHistory = void 0;
const TransactionHistory_1 = require("../../core/TransactionHistory");
/**
 * Get transaction history for a specific product
 */
const getProductTransactionHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameter: productId"
            });
        }
        const transactions = yield TransactionHistory_1.TransactionHistoryService.getProductTransactionHistory(productId);
        return res.status(200).json({
            success: true,
            data: {
                transactions,
                count: transactions.length
            }
        });
    }
    catch (error) {
        console.error("Error in getProductTransactionHistory:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching product transaction history"
        });
    }
});
exports.getProductTransactionHistory = getProductTransactionHistory;
/**
 * Get transaction history for a specific user
 */
const getUserTransactionHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameter: userId"
            });
        }
        const transactions = yield TransactionHistory_1.TransactionHistoryService.getUserTransactionHistory(userId);
        return res.status(200).json({
            success: true,
            data: {
                transactions,
                count: transactions.length
            }
        });
    }
    catch (error) {
        console.error("Error in getUserTransactionHistory:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching user transaction history"
        });
    }
});
exports.getUserTransactionHistory = getUserTransactionHistory;
