import express from "express"
import StateRoute from "./StateRoute"
import BlockRoute from "./BlockRoute"
import TransactionRoute from "./TransactionRoute"

const router = express.Router()

router.get("/", function (_req, res) {
  return res.status(200).json({
    message: "Welcome to API. Check the documentation for more information",
  })
})

router.use("/state", StateRoute)
router.use("/block", BlockRoute)
router.use("/transaction", TransactionRoute)

export default router
