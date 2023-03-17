import Block from "../block"

interface BlockInterface {
  timestamp: number
  lastHash: string
  hash: string
  data: any
  difficulty: number
  nonce: number
}

interface BlockchainInterface {
  chain: Array<Block>
}

export type { BlockInterface, BlockchainInterface }
