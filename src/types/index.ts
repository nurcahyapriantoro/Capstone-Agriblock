import WebSocket from "ws"
import Block from "../block"
import { MessageTypeEnum } from "../enum"
import SyncQueue from "../core/queue"
import Transaction from "../transaction"

interface BlockInterface {
  timestamp: number
  lastHash: string
  hash: string
  data: any
  difficulty: number
  nonce: number
  number: number
}

interface BlockchainInterface {
  chain: Array<Block>
  transaction: Array<any>
}

type TransactionInterface<T = any> = {
  from: string
  to: string
  data: T
}

type MessageInterface<T> = {
  type: MessageTypeEnum
  data: T
}

interface ConnectedNode {
  socket: WebSocket
  address: string
}

interface ChainInfo {
  syncQueue: SyncQueue
  latestBlock: Block
  latestSyncBlock: null | Block
  transactionPool: Array<Transaction>
  checkedBlock: Record<string, boolean>
}

export type {
  BlockInterface,
  BlockchainInterface,
  TransactionInterface,
  MessageInterface,
  ConnectedNode,
  ChainInfo,
}
