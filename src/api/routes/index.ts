import express from "express"
import StateRoute from "./StateRoute"
import BlockRoute from "./BlockRoute"
import BlockchainRoute from "./BlockchainRoute"
import TransactionRoute from "./TransactionRoute"
import UserRoute from "./UserRoute"
import RoleRoute from "./RoleRoute"
import ProductRoute from "./ProductRoute"
import TransactionHistoryRoute from "./TransactionHistoryRoute"
import ProductManagementRoute from "./ProductManagementRoute"
import PaymentRoutes from "./PaymentRoutes"
import DisputeRoute from "./DisputeRoute"

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
router.use("/role", RoleRoute)
router.use("/product", ProductRoute)
router.use("/history", TransactionHistoryRoute)
router.use("/product-management", ProductManagementRoute)
router.use("/payment", PaymentRoutes)
router.use("/disputes", DisputeRoute)

export default router
