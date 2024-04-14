import express from "express"

import catcher from "../helper/handler"
import { getLatestBlock, getMiningState } from "../controller/StateController"

const router = express.Router()

router.get("/latest-block", catcher(getLatestBlock))
router.get("/mining", catcher(getMiningState))

export default router
