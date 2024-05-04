import express from "express"

import catcher from "../helper/handler"
import { getMiningState, getStaker } from "../controller/StateController"

const router = express.Router()

router.get("/mining", catcher(getMiningState))
router.get("/staker", catcher(getStaker))

export default router
