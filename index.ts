import express from "express"
import Blockchain from "./src/blockchain"
import dotenv from "dotenv"
import PubSub from "./pubsub"
import axios from "axios"
// import cors from "cors"
// import apiRoutes from "./src/routes"
// import catch404Error from "./src/middleware/catch404"
// import handleError from "./src/middleware/errorHandler"
// import { initScheduledJobs } from "./src/service/scheduler"

dotenv.config()

const app = express()
const blockchain = new Blockchain()
const pubsub = new PubSub({ blockchain })

const DEFAULT_PORT = Number(process.env.APP_PORT || 3000)
const ROOT_NODE_ADDRESS = `http:localhost:${DEFAULT_PORT}`

app.use(express.json())

app.get("/api/blocks", (req, res) => {
  res.json(blockchain.chain)
})

app.post("/api/mine", (req, res) => {
  const { data } = req.body
  blockchain.addBlock({
    data,
  })

  pubsub.broadcastChain()

  res.redirect("/api/blocks")
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// app.use(cors())
// app.use("/api", apiRoutes)
// app.use(catch404Error)
// app.use(handleError)

const syncChains = () => {
  axios.get(`${ROOT_NODE_ADDRESS}/api/blocks `).then((response) => {
    console.log(response.data)

    blockchain.replaceChain(response.data)
  })
}

const PORT =
  process.env.GENERATE_PEER_PORT === "true"
    ? DEFAULT_PORT + Math.ceil(Math.random() * 1000)
    : DEFAULT_PORT

app.listen(PORT, () => {
  console.log(`Server up on port ${PORT}`)
  syncChains()
})
