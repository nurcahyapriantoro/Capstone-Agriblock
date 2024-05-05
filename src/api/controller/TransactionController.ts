import Block from "../../block"
import Transaction from "../../transaction"

import { blockDB, txhashDB } from "../../helper/level.db.client"
import { getKeyPair } from "../../../utils/keypair"
import type { Request, Response } from "express"
import type { ChainInfo } from "../../types"
import type { TransactionInterface } from "../validation/transactionSchema"

const getTransaction = async (req: Request, res: Response) => {
  const { hash } = req.params

  try {
    const [blockNumber, txIndex] = await txhashDB
      .get(String(hash))
      .then((data) => {
        const [blockNumber, txIndex] = data.split(" ")
        return [Number(blockNumber), Number(txIndex)]
      })

    const block: Block = await blockDB
      .get(String(blockNumber))
      .then((data) => JSON.parse(data))

    const transaction = block.data.find((_tx, index) => index === txIndex)

    res.json({
      metadata: {
        blockNumber: blockNumber,
        transactionIndex: txIndex,
      },
      data: transaction,
    })
  } catch (err) {
    res.status(404).json({
      message: "Transaction not found",
    })
  }
}

const signTransaction = async (req: Request, res: Response) => {
  const { privateKey, data, from, to, lastTransactionHash } =
    req.body as TransactionInterface

  const keyPair = getKeyPair(privateKey)

  try {
    const transaction = new Transaction({
      data,
      from,
      to,
      lastTransactionHash,
    })
    transaction.sign(keyPair)

    res.json({
      data: transaction,
    })
  } catch (err) {
    res.status(400).json({
      message: err,
    })
  }
}

const createTransaction = async (req: Request, res: Response) => {
  const { data, from, to, privateKey, lastTransactionHash } =
    req.body as TransactionInterface

  const keyPair = getKeyPair(privateKey)

  try {
    const transaction = new Transaction({
      data,
      from,
      to,
      lastTransactionHash,
    })
    transaction.sign(keyPair)

    const isValid = await res.locals.transactionHandler(transaction)

    if (isValid) {
      return res.status(201).json({
        message: "Transaction created successfully",
      })
    }
  } catch (err) {
    console.error("Invalid transaction data!")
  }

  res.status(400).json({
    message: "Invalid transaction",
  })
}

const getTransactionPool = async (req: Request, res: Response) => {
  const chainInfo = res.locals.chainInfo as ChainInfo

  res.json({
    data: {
      transactionPool: chainInfo.transactionPool,
    },
  })
}

export {
  getTransaction,
  signTransaction,
  createTransaction,
  getTransactionPool,
}
