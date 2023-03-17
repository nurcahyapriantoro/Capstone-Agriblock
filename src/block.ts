import { GENESIS_DATA, MINE_RATE } from "./config"
import cryptoHash from "./crypto-hash"

import type { BlockInterface } from "./types"

class Block implements BlockInterface {
  constructor({
    timestamp,
    lastHash,
    hash,
    data,
    difficulty,
    nonce,
  }: BlockInterface) {
    this.timestamp = timestamp
    this.lastHash = lastHash
    this.hash = hash
    this.data = data
    this.difficulty = difficulty
    this.nonce = nonce
  }
  difficulty: number
  nonce: number
  lastHash: string
  hash: string
  timestamp: number
  data: any

  static genesis() {
    return new this(GENESIS_DATA)
  }

  static mineBlock({ lastBlock, data }: { lastBlock: Block; data: any }) {
    const lastHash = lastBlock.hash
    let hash: string, timestamp: number
    let { difficulty } = lastBlock
    let nonce = 0

    do {
      nonce++
      timestamp = Date.now()
      difficulty = Block.adjustDifficulty({
        originalBlock: lastBlock,
        timestamp,
      })

      hash = cryptoHash(timestamp, lastHash, data, nonce, difficulty)
      console.log(
        `difficulty ${difficulty}, timestamp ${timestamp}, nonce ${nonce}, hash ${hash}`
      )
    } while (hash.substring(0, difficulty) !== "0".repeat(difficulty))

    return new this({
      timestamp,
      lastHash,
      data,
      hash,
      difficulty,
      nonce,
    })
  }

  static adjustDifficulty({
    originalBlock,
    timestamp,
  }: {
    originalBlock: Block
    timestamp: number
  }) {
    const { difficulty } = originalBlock

    if (difficulty < 1) return 1

    return timestamp - originalBlock.timestamp > MINE_RATE
      ? difficulty - 1
      : difficulty + 1
  }
}

export default Block
