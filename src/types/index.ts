import WebSocket from "ws"
import Block from "../block"
import SyncQueue from "../core/queue"
import Transaction from "../transaction"
import ProofOfStake from "../consensus/pos"

import { Level } from "level"
import { MessageTypeEnum } from "../enum"

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

interface ConnectedNode extends Peer {
  socket: WebSocket
}

interface ChainInfo {
  syncQueue: SyncQueue
  latestBlock: Block
  latestSyncBlock: null | Block
  transactionPool: Array<Transaction>
  checkedBlock: Record<string, boolean>
  consensus: ProofOfStake
}

interface StateInterface {
  name: string
  publicKey: string
}

type DBType = Level<string, string>

interface Peer {
  wsAddress: string
  publicKey: string
}

export type {
  BlockInterface,
  BlockchainInterface,
  TransactionInterface,
  MessageInterface,
  StateInterface,
  ConnectedNode,
  ChainInfo,
  DBType,
  Peer,
}
