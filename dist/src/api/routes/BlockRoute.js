"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const handler_1 = __importDefault(require("../helper/handler"));
const BlockController_1 = require("../controller/BlockController");
const router = (0, express_1.Router)();
router.get("/", (0, handler_1.default)(BlockController_1.getBlock));
router.get("/transactions", (0, handler_1.default)(BlockController_1.getBlockTransactions));
exports.default = router;
