import WebSocket from "ws"
import { produceMessage } from "./message"
import { MessageTypeEnum } from "../src/enum"
import type { ConnectedNode, Peer } from "../src/types"

interface Params {
  peer: Peer
  currentNode: Peer
  connectedNodes: Map<string, ConnectedNode>
}

async function connect({ connectedNodes, currentNode, peer }: Params) {
  const socket = new WebSocket(peer.wsAddress)

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
    // TODO: implement reconnect mechanism when connection error

    console.log(
      `\x1b[31mERROR\x1b[0m [${new Date().toISOString()}] Error when trying to connect to ${
        peer.publicKey
      }.`,
      err
    )
  })

  socket.on("close", () => {
    // TODO: implement reconnect mechanism when connection closed

    // remove addres from connected peers when connection closed
    connectedNodes.delete(peer.publicKey)

    console.log(
      `\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Disconnected from ${
        peer.publicKey
      }.`
    )
  })
}

export default connect
