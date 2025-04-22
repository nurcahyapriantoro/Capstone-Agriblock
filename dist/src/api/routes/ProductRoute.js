"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ProductController_1 = require("../controller/ProductController");
const router = express_1.default.Router();
// POST create a new product
router.post("/", ProductController_1.createProduct);
// GET a product by ID
router.get("/:productId", ProductController_1.getProduct);
// GET all products owned by a specific user
router.get("/owner/:ownerId", ProductController_1.getProductsByOwner);
// POST transfer ownership of a product
router.post("/transfer", ProductController_1.transferOwnership);
exports.default = router;
