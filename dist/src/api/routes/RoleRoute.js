"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const RoleController_1 = require("../controller/RoleController");
const router = express_1.default.Router();
// GET a user's role
router.get("/:userId", RoleController_1.getUserRole);
// POST validate if a user can perform an action
router.post("/validate-action", RoleController_1.validateUserAction);
// POST validate a transaction between two users
router.post("/validate-transaction", RoleController_1.validateTransaction);
exports.default = router;
