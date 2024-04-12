import WebSocket, { RawData } from "ws"
import { MessageTypeEnum } from "../src/enum"

const produceMessage = <T>(type: MessageTypeEnum, data: T) => {
  // Produce a JSON message
  return JSON.stringify({ type, data })
}

const sendMessage = (message: RawData | string, nodes: Array<WebSocket>) => {
  // Broadcast message to all nodes
  nodes.forEach((node) => node.send(message))
}

export { produceMessage, sendMessage }
