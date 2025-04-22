"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const StateRoute_1 = __importDefault(require("./StateRoute"));
const BlockRoute_1 = __importDefault(require("./BlockRoute"));
const BlockchainRoute_1 = __importDefault(require("./BlockchainRoute"));
const TransactionRoute_1 = __importDefault(require("./TransactionRoute"));
const UserRoute_1 = __importDefault(require("./UserRoute"));
const RoleRoute_1 = __importDefault(require("./RoleRoute"));
const ProductRoute_1 = __importDefault(require("./ProductRoute"));
const TransactionHistoryRoute_1 = __importDefault(require("./TransactionHistoryRoute"));
const ProductManagementRoute_1 = __importDefault(require("./ProductManagementRoute"));
const paymentRoutes_1 = __importDefault(require("./paymentRoutes"));
const router = express_1.default.Router();
router.get("/", function (_req, res) {
    return res.status(200).json({
        message: "Welcome to API. Check the documentation for more information",
    });
});
router.use("/node", StateRoute_1.default);
router.use("/block", BlockRoute_1.default);
router.use("/blockchain", BlockchainRoute_1.default);
router.use("/transaction", TransactionRoute_1.default);
router.use("/user", UserRoute_1.default);
router.use("/role", RoleRoute_1.default);
router.use("/product", ProductRoute_1.default);
router.use("/history", TransactionHistoryRoute_1.default);
router.use("/product-management", ProductManagementRoute_1.default);
router.use("/payment", paymentRoutes_1.default);
exports.default = router;
