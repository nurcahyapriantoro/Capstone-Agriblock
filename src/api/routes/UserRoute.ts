import { Router } from "express"

import catcher from "../helper/handler"
import {
  generateWallet,
  getUserList,
  getUser,
  register,
  login,
  getPrivateKey,
  linkGoogleAccount,
  googleLogin
} from "../controller/UserController"
import { authenticateJWT } from "../../middleware/auth"

const router = Router()

// Rute autentikasi
router.post("/register", catcher(register))
router.post("/login", catcher(login))

// Rute untuk integrasi Google (simulasi)
router.post("/link-google", catcher(linkGoogleAccount))
router.post("/google-login", catcher(googleLogin))

// Rute wallet dengan autentikasi
router.post("/generate-wallet", authenticateJWT, catcher(generateWallet))
router.post("/private-key", authenticateJWT, catcher(getPrivateKey))

// Rute user asli
router.get("/", catcher(getUserList))
router.get("/:address", catcher(getUser))

export default router
