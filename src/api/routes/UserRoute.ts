import { Router } from "express"

import catcher from "../helper/handler"
import {
  generateWallet,
  getUserList,
  getUser,
} from "../controller/UserController"

const router = Router()

router.post("/generate-wallet", catcher(generateWallet))
router.get("/", catcher(getUserList))
router.get("/:address", catcher(getUser))

export default router
