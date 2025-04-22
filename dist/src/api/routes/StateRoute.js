"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const handler_1 = __importDefault(require("../helper/handler"));
const StateController_1 = require("../controller/StateController");
const router = express_1.default.Router();
router.get("/mining", (0, handler_1.default)(StateController_1.getMiningState));
router.get("/staker", (0, handler_1.default)(StateController_1.getStaker));
router.get("/connected-node", (0, handler_1.default)(StateController_1.getConnectedNode));
exports.default = router;
