import Block from "../../block"
import Transaction from "../../transaction"

import { blockDB, txhashDB } from "../../helper/level.db.client"
import { getKeyPair } from "../../../utils/keypair"
import type { Request, Response } from "express"

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
  const { privateKey, data, from, to } = req.body

  const keyPair = getKeyPair(privateKey)

  try {
    const transaction = new Transaction({
      data,
      from,
      to,
    })
    transaction.sign(keyPair)

    res.json({
      data: transaction,
    })
  } catch (err) {
    res.json({
      message: "success",
    })
  }
}

export { getTransaction, signTransaction }
