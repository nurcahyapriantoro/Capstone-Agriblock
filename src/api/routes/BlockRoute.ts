import { Router } from "express"

import catcher from "../helper/handler"
import { getBlock, getBlockTransactions } from "../controller/BlockController"

const router = Router()

router.get("/:hash", catcher(getBlock))
router.get("/:hash/transactions", catcher(getBlockTransactions))

export default router
