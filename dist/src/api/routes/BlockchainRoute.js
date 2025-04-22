"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const handler_1 = __importDefault(require("../helper/handler"));
const BlockchainController_1 = require("../controller/BlockchainController");
const router = (0, express_1.Router)();
router.get("/last-block", (0, handler_1.default)(BlockchainController_1.getLastBlock));
router.get("/state", (0, handler_1.default)(BlockchainController_1.getBlockchainState));
exports.default = router;
