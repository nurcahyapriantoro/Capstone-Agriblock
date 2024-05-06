import { Router } from "express"

import catcher from "../helper/handler"
import {
  getLastBlock,
  getBlockchainState,
} from "../controller/BlockchainController"

const router = Router()

router.get("/last-block", catcher(getLastBlock))
router.get("/state", catcher(getBlockchainState))

export default router
