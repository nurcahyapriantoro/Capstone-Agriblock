import express from "express"

import catcher from "../helper/handler"
import {
  getConnectedNode,
  getMiningState,
  getStaker,
} from "../controller/StateController"

const router = express.Router()

router.get("/mining", catcher(getMiningState))
router.get("/staker", catcher(getStaker))
router.get("/connected-node", catcher(getConnectedNode))

export default router
