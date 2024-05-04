import { Router } from "express"

import catcher from "../helper/handler"
import { getLastBlock, getTotalBlock } from "../controller/BlockchainController"

const router = Router()

router.get("/last-block", catcher(getLastBlock))
router.get("/total-block", catcher(getTotalBlock))

export default router
