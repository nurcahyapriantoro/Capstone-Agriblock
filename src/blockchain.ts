import Block from "./block"
import cryptoHash from "./crypto-hash"
import type { BlockchainInterface } from "./types"

class Blockchain implements BlockchainInterface {
  constructor() {
    this.chain = [Block.genesis()]
  }
  chain: Block[]

  static isValidChain(chain: Array<Block>) {
    if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis()))
      return false

    for (let i = 1; i < chain.length; i++) {
      const { timestamp, data, hash, lastHash, difficulty, nonce } = chain[i]
      const { hash: actualLastHash, difficulty: lastDifficulty } = chain[i - 1]

      if (lastHash !== actualLastHash) return false

      const validatedHash = cryptoHash(
        timestamp,
        lastHash,
        data,
        nonce,
        difficulty
      )
      if (
        hash !== validatedHash ||
        Math.abs(lastDifficulty - difficulty) > 1 //prevent difficulty jump
      )
        return false
    }

    return true
  }

  addBlock({ data }: { data: any }) {
    const newBlock = Block.mineBlock({
      data,
      lastBlock: this.chain[this.chain.length - 1],
    })

    this.chain.push(newBlock)
  }

  replaceChain(newChain: Array<Block>) {
    if (newChain.length <= this.chain.length) {
      console.error("The incoming chain must be longer!")
      return
    }
    if (!Blockchain.isValidChain(newChain)) {
      console.error("The incoming chain must be valid!")
      return
    }

    this.chain = newChain
  }
}

export default Blockchain
