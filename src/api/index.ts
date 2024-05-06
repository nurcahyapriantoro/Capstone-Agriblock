import express, {
  type NextFunction,
  type Response,
  type Request,
} from "express"
import cors from "cors"

import Transaction from "../transaction"
import apiRoutes from "./routes"
import catch404Error from "./middleware/catch404"
import handleError from "./middleware/errorHandler"

import type { ChainInfo, ConnectedNode } from "../types"

const app = express()

const api = (
  port: number,
  client: {
    publicKey: string
    mining: boolean
    chainInfo: ChainInfo
    connectedNodes: Map<string, ConnectedNode>
  },
  transactionHandler: (transaction: Transaction) => void
) => {
  const { chainInfo, publicKey, mining, connectedNodes } = client

  const localsMiddleware = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ) => {
    res.locals = {
      chainInfo,
      mining,
      getConnectedNode: () => {
        return [...connectedNodes.values()].map((node) => node.publicKey)
      },
      transactionHandler,
    }
    next()
  }

  process.on("uncaughtException", (err) =>
    console.log(
      `\x1b[31mERROR\x1b[0m [${new Date().toISOString()}] Uncaught Exception`,
      err
    )
  )

  // setup middleware
  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // setup routes
  app.use("/api", localsMiddleware, apiRoutes)

  app.get("/api/node/address", (req, res) => {
    res.json({
      data: { publicKey },
    })
  })

  app.use(catch404Error)
  app.use(handleError)

  app.listen(port, () => {
    console.log(`Server up on port ${port}`)
  })
}

export default api
