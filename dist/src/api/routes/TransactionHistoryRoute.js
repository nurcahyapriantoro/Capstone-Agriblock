"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const TransactionHistoryController_1 = require("../controller/TransactionHistoryController");
const router = express_1.default.Router();
// GET transaction history for a specific product
router.get("/product/:productId", TransactionHistoryController_1.getProductTransactionHistory);
// GET transaction history for a specific user
router.get("/user/:userId", TransactionHistoryController_1.getUserTransactionHistory);
exports.default = router;
