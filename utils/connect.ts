import WebSocket from "ws"
import { produceMessage } from "./message"
import { MessageTypeEnum } from "../src/enum"
import type { ConnectedNode, Peer } from "../src/types"

interface Params {
  peer: Peer
  signature: string
  currentNode: Peer
  connectedNodes: Map<string, ConnectedNode>
}

let reconnectInterval = 1000 // Initial reconnect interval in milliseconds
let maxReconnectInterval = 30000 // Maximum reconnect interval in milliseconds
let reconnectAttempts = 0
const maxReconnectAttempts = 10

async function connect(params: Params) {
  const { connectedNodes, currentNode, peer, signature } = params
  const socket = new WebSocket(peer.wsAddress, {
    headers: {
      "x-address": currentNode.publicKey,
      "x-signature": signature,
    },
  })

  socket.on("open", () => {
    console.log("sending next message")
    socket.send(
      produceMessage(MessageTypeEnum.HANDSHAKE, [
        currentNode,
        ...Array.from(connectedNodes.values(), ({ publicKey, wsAddress }) => ({
          wsAddress,
          publicKey,
        })),
      ]) // send the connected address of the current node
    )

    // inform other node that a new node is added to the list
    connectedNodes.forEach((node) =>
      node.socket.send(
        JSON.stringify(produceMessage(MessageTypeEnum.HANDSHAKE, [peer])) // inform other node of the current connected node
      )
    )

    // add the new address into list of connected peers
    connectedNodes.set(peer.publicKey, {
      ...peer,
      socket,
    })

    console.log(
      `\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Connected to ${
        peer.publicKey
      }.`
    )
  })

  socket.on("error", (err) => {
    const errorCode = Number(err.message.split(" ").pop())

    // if error code is 403, the connection is rejected
    if (Number.isInteger(errorCode) && errorCode === 403) {
      console.log(
        `\x1b[31mERROR\x1b[0m [${new Date().toISOString()}] Connection rejected from ${
          peer.publicKey
        }.`,
        err
      )

      return
    }

    // reconnect if error
    reconnect(params)

    console.log(
      `\x1b[31mERROR\x1b[0m [${new Date().toISOString()}] Error when trying to connect to ${
        peer.publicKey
      }.`,
      err
    )
  })

  socket.on("close", () => {
    // remove addres from connected peers when connection closed
    connectedNodes.delete(peer.publicKey)

    console.log(
      `\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Disconnected from ${
        peer.publicKey
      }.`
    )
  })
}

const reconnect = (params: Params) => {
  if (reconnectAttempts < maxReconnectAttempts) {
    reconnectAttempts++
    let reconnectIntervalWithBackoff = Math.min(
      maxReconnectInterval,
      reconnectInterval * ++reconnectAttempts
    )
    console.log(
      `Attempting to reconnect in ${reconnectIntervalWithBackoff} milliseconds...`
    )
    setTimeout(() => connect(params), reconnectIntervalWithBackoff)
  } else {
    console.error("Exceeded maximum number of reconnect attempts.")
    // You might want to notify the user or take other appropriate actions here
  }
}

export default connect
