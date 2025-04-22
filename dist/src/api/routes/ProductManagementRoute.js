"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ProductManagementController_1 = require("../controller/ProductManagementController");
const router = express_1.default.Router();
// POST update product status
router.post("/status", ProductManagementController_1.updateProductStatus);
// POST recall a product
router.post("/recall", ProductManagementController_1.recallProduct);
// POST verify product quality
router.post("/verify", ProductManagementController_1.verifyProduct);
// GET all recalled products
router.get("/recalled", ProductManagementController_1.getRecalledProducts);
// GET the latest status of a product
router.get("/status/:productId", ProductManagementController_1.getProductStatus);
exports.default = router;
