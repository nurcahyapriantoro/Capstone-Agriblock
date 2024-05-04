import express from "express"
import StateRoute from "./StateRoute"
import BlockRoute from "./BlockRoute"
import BlockchainRoute from "./BlockchainRoute"
import TransactionRoute from "./TransactionRoute"
import UserRoute from "./UserRoute"

const router = express.Router()

router.get("/", function (_req, res) {
  return res.status(200).json({
    message: "Welcome to API. Check the documentation for more information",
  })
})

router.use("/node", StateRoute)
router.use("/block", BlockRoute)
router.use("/blockchain", BlockchainRoute)
router.use("/transaction", TransactionRoute)
router.use("/user", UserRoute)

export default router
