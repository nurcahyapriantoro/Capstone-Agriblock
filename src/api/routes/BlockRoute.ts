import { Router } from "express"

import catcher from "../helper/handler"
import { getBlock, getBlockTransactions } from "../controller/BlockController"

const router = Router()

router.get("/", catcher(getBlock))
router.get("/transactions", catcher(getBlockTransactions))

export default router
