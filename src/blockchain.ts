import Block from "./block"
import Transaction from "./transaction"

import { cryptoHashV2 } from "./crypto-hash"
import { MINT_KEY_PAIR, MINT_PUBLIC_ADDRESS } from "./config"

class Blockchain {
  chain: Block[]
  transactions: Array<Transaction>

  constructor() {
    this.chain = [Block.genesis()]
    this.transactions = []
  }

  static isValidChain(chain: Array<Block>) {
    if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis()))
      return false

    for (let i = 1; i < chain.length; i++) {
      const { timestamp, data, hash, lastHash, difficulty, nonce } = chain[i]
      const { hash: actualLastHash, difficulty: lastDifficulty } = chain[i - 1]

      if (lastHash !== actualLastHash) return false

      const validatedHash = cryptoHashV2(
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

  getLastBlock() {
    return this.chain[this.chain.length - 1]
  }

  addBlock({ data }: { data: Array<any> }) {
    const newBlock = Block.mineBlock({
      data,
      lastBlock: this.getLastBlock(),
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

  mineTransaction(rewardAddress: string) {
    const rewardTransaction = new Transaction({
      from: MINT_PUBLIC_ADDRESS,
      to: rewardAddress,
      data: [],
    })
    rewardTransaction.sign(MINT_KEY_PAIR)

    this.addBlock({
      data: [rewardTransaction, ...this.transactions],
    })
    this.transactions = []
  }

  addTransaction(transaction: Transaction) {
    if (transaction.isValid()) this.transactions.push(transaction)
  }
}

export default Blockchain
