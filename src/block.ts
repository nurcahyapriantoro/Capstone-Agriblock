import { GENESIS_DATA, MINE_RATE } from "./config"
import { cryptoHashV2 } from "./crypto-hash"
import { hexToBinary } from "../utils/hexToBinary"

import type { BlockInterface, TransactionInterface } from "./types"

class Block {
  difficulty: number
  nonce: number
  lastHash: string
  hash: string
  timestamp: number
  number: number
  data: Array<any>

  constructor({
    timestamp,
    lastHash,
    hash,
    data,
    difficulty,
    nonce,
    number,
  }: BlockInterface) {
    this.timestamp = timestamp
    this.lastHash = lastHash
    this.hash = hash
    this.data = data
    this.difficulty = difficulty
    this.nonce = nonce
    this.number = number
  }

  static genesis() {
    return new this(GENESIS_DATA)
  }

  static mineBlock({
    lastBlock,
    data,
  }: {
    lastBlock: Block
    data: Array<any>
  }) {
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

      hash = cryptoHashV2(timestamp, lastHash, data, nonce, difficulty)
      console.log(
        `difficulty ${difficulty}, timestamp ${timestamp}, nonce ${nonce}, hash ${hash}`
      )
    } while (
      hexToBinary(hash).substring(0, difficulty) !== "0".repeat(difficulty)
    )

    return new this({
      timestamp,
      lastHash,
      data,
      hash,
      difficulty,
      nonce,
      number: lastBlock.number + 1,
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
