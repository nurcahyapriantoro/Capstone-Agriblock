import { Router } from "express"

import catcher from "../helper/handler"
import {
  getTransaction,
  signTransaction,
  createTransaction,
  getTransactionPool,
  transferCoin,
  stakeCoin,
  getTransactionFlow,
  createBenih,
  purchaseCoin,
} from "../controller/TransactionController"
import validate from "../middleware/validation"
import {
  transactionSchema,
  coinTransferSchema,
  coinStakeSchema,
  createBenihSchema,
  purchaseCoinSchema,
} from "../validation/transactionSchema"

const router = Router()

router.post("/create", validate(transactionSchema), catcher(createTransaction))
router.post("/create-benih", validate(createBenihSchema), catcher(createBenih))
router.post("/sign", validate(transactionSchema), catcher(signTransaction))
router.post(
  "/purchase-coin",
  validate(purchaseCoinSchema),
  catcher(purchaseCoin)
)
router.post(
  "/transfer-coin",
  validate(coinTransferSchema),
  catcher(transferCoin)
)
router.post("/stake", validate(coinStakeSchema), catcher(stakeCoin))

router.get("/pool", catcher(getTransactionPool))
router.get("/:hash", catcher(getTransaction))
router.get("/:hash/flow", catcher(getTransactionFlow))

export default router
