import { Router } from "express"

import catcher from "../helper/handler"
import {
  getTransaction,
  signTransaction,
} from "../controller/TransactionController"
import validate from "../middleware/validation"
import { transactionSchema } from "../validation/transactionSchema"

const router = Router()

router.get("/:hash", catcher(getTransaction))
router.post("/sign", validate(transactionSchema), catcher(signTransaction))

export default router
