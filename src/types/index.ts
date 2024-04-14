import WebSocket from "ws"
import Block from "../block"
import { MessageTypeEnum } from "../enum"
import SyncQueue from "../core/queue"
import Transaction from "../transaction"
import { Level } from "level"

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

interface StateInterface {
  name: string
  publicKey: string
}

type DBType = Level<string, string>

export type {
  BlockInterface,
  BlockchainInterface,
  TransactionInterface,
  MessageInterface,
  StateInterface,
  ConnectedNode,
  ChainInfo,
  DBType,
}
