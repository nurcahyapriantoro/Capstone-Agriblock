import { Router } from "express"

import catcher from "../helper/handler"
import { generateWallet, getUserList } from "../controller/UserController"

const router = Router()

router.post("/generate-wallet", catcher(generateWallet))
router.get("/", catcher(getUserList))

export default router
