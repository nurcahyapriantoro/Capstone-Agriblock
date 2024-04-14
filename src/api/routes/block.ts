import { Router } from "express"

import catcher from "../helper/handler"
import { getBlockByHash, getBlocks } from "../controller/BlockController"

const router = Router()

router.get("/", catcher(getBlocks))
router.get("/hash/:hash", catcher(getBlockByHash))

export default router
