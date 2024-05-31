import Transaction from "./transaction"

import { GENESIS_DATA, MINE_RATE } from "./config"
import { cryptoHashV2 } from "./crypto-hash"
import { hexToBinary } from "../utils/hexToBinary"
import { TransactionTypeEnum, blockchainTransactions } from "./enum"

import type { BlockInterface } from "./types"
import type { Level } from "level"

class Block {
  difficulty: number
  nonce: number
  lastHash: string
  hash: string
  timestamp: number
  number: number
  data: Array<Transaction>

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

    const dataString = JSON.stringify(data)

    do {
      nonce++
      timestamp = Date.now()
      difficulty = Block.adjustDifficulty({
        originalBlock: lastBlock,
        timestamp,
      })

      hash = cryptoHashV2(timestamp, lastHash, dataString, nonce, difficulty)
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

  static async verifyTxAndTransit({
    block,
    stateDB,
  }: {
    block: Block
    stateDB: Level<string, string>
  }) {
    // Basic verification
    if (!block.data.every((transaction) => transaction.isValid())) return false

    // Get all existing addresses
    const addressesInBlock = block.data.map((tx) => tx.from)
    const existedAddresses = await stateDB.keys().all()
    // If senders' address doesn't exist, return false
    if (
      !addressesInBlock.every((address) => existedAddresses.includes(address))
    )
      return false

    // Start state replay to check if transactions are legit
    let states: Record<string, any> = {}

    for (const tx of block.data) {
      const txSenderAddress = tx.from

      // NOTES: update sender's balance
      if (
        tx.data.type === TransactionTypeEnum.STAKE ||
        tx.data.type === TransactionTypeEnum.COIN_PURCHASE
      ) {
        if (!states[txSenderAddress]) {
          const senderState = await stateDB
            .get(txSenderAddress)
            .then((data) => JSON.parse(data))

          // mark the block as invalid if the sender doesn't have enough balance
          if (senderState.balance < tx.data.amount) return false

          states[txSenderAddress] = senderState
          states[txSenderAddress].balance -= tx.data.amount
        } else {
          // mark the block as invalid if the sender doesn't have enough balance
          if (states[txSenderAddress].balance < tx.data.amount) return false

          states[txSenderAddress].balance -= tx.data.amount
        }
      }

      // NOTES: update receiver's balance
      if (tx.data.type === TransactionTypeEnum.COIN_PURCHASE) {
        if (!existedAddresses.includes(tx.to) && !states[tx.to]) {
          states[tx.to] = {
            address: tx.to,
            balance: 0,
          }
        }

        if (existedAddresses.includes(tx.to) && !states[tx.to]) {
          states[tx.to] = await stateDB
            .get(tx.to)
            .then((data) => JSON.parse(data))
        }

        states[tx.to].balance += tx.data.amount
      }

      // NOTES: update user transaction history
      if (!blockchainTransactions.includes(tx.data.type)) {
        const txHash = tx.getHash()

        // NOTES: update sender outgoing transactions
        if (!states[txSenderAddress]) {
          const senderState = await stateDB
            .get(txSenderAddress)
            .then((data) => JSON.parse(data))

          states[txSenderAddress] = senderState
        }
        states[txSenderAddress].outgoingTransactions = [
          ...(states[txSenderAddress].outgoingTransactions ?? []),
          txHash,
        ]

        // NOTES: update receiver incoming transactions
        if (!existedAddresses.includes(tx.to) && !states[tx.to]) {
          states[tx.to] = {
            address: tx.to,
            balance: 0,
            incomingTransactions: [],
          }
        }
        if (existedAddresses.includes(tx.to) && !states[tx.to]) {
          states[tx.to] = await stateDB
            .get(tx.to)
            .then((data) => JSON.parse(data))
        }
        states[tx.to].incomingTransactions = [
          ...(states[tx.to].incomingTransactions ?? []),
          txHash,
        ]
      }
    }

    // Reward
    const rewardTransaction = block.data[0]
    const isMinerAddressExist = existedAddresses.includes(rewardTransaction.to)
    const totalTransaction = block.data.length - 1

    if (!isMinerAddressExist && !states[rewardTransaction.to]) {
      states[rewardTransaction.to] = {
        address: rewardTransaction.to,
        balance: 0,
      }
    }

    if (isMinerAddressExist && !states[rewardTransaction.to]) {
      states[rewardTransaction.to] = await stateDB
        .get(rewardTransaction.to)
        .then((data) => JSON.parse(data))
    }

    states[rewardTransaction.to].balance += totalTransaction

    for (const account of Object.keys(states)) {
      await stateDB.put(account, JSON.stringify(states[account]))
    }

    return true
  }
}

export default Block
