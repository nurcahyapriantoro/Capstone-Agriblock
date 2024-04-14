import express from "express"
import StateRoute from "./state"
import BlockRoute from "./block"

const router = express.Router()

router.get("/", function (_req, res) {
  return res.status(200).json({
    message: "Welcome to API. Check the documentation for more information",
  })
})

router.use("/state", StateRoute)
router.use("/blocks", BlockRoute)

export default router
