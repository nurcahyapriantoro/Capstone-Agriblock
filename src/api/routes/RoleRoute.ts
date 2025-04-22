import express from "express";
import { validateUserAction, validateTransaction, getUserRole } from "../controller/RoleController";

const router = express.Router();

// GET a user's role
router.get("/:userId", getUserRole);

// POST validate if a user can perform an action
router.post("/validate-action", validateUserAction);

// POST validate a transaction between two users
router.post("/validate-transaction", validateTransaction);

export default router; 