"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const handler_1 = __importDefault(require("../helper/handler"));
const UserController_1 = require("../controller/UserController");
const router = (0, express_1.Router)();
router.post("/generate-wallet", (0, handler_1.default)(UserController_1.generateWallet));
router.get("/", (0, handler_1.default)(UserController_1.getUserList));
router.get("/:address", (0, handler_1.default)(UserController_1.getUser));
exports.default = router;
