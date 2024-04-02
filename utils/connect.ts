import WebSocket from "ws"
import { produceMessage } from "./message"
import { MessageTypeEnum } from "../src/enum"
import { ConnectedNode } from "../src/types"

interface Params {
  myAddress: string
  address: string
  connectedNodes: Map<string, ConnectedNode>
}

async function connect({ connectedNodes, myAddress, address }: Params) {
  const socket = new WebSocket(address)

  socket.on("open", () => {
    socket.send(
      JSON.stringify(
        produceMessage(MessageTypeEnum.HANDSHAKE, [
          myAddress,
          ...Array.from(connectedNodes.values(), ({ address }) => address),
        ]) // send the connected address of the current node
      )
    )

    connectedNodes.forEach((node) =>
      node.socket.send(
        JSON.stringify(produceMessage(MessageTypeEnum.HANDSHAKE, [address])) // inform other node of the current connected node
      )
    )

    // add the new address into list of connected peers
    connectedNodes.set(address, {
      socket,
      address,
    })

    console.log(
      `\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Connected to ${address}.`
    )
  })

  socket.on("close", () => {
    // remove addres from connected peers when connection closed
    connectedNodes.delete(address)

    console.log(
      `\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Disconnected from ${address}.`
    )
  })
}

export default connect
