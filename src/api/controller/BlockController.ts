import type { Request, Response } from "express"
import Block from "../../block"

import { bhashDB, blockDB } from "../../helper/level.db.client"

const getBlock = async (req: Request, res: Response) => {
  const { hash = "", number = "" } = req.query

  if (!hash && !number) {
    return res.status(400).json({
      message: "Query string must contain either 'hash' or 'number'.",
    })
  }

  await getBlockData(String(number), String(hash))
    .then((data) => {
      return res.json({
        data: {
          block: data,
        },
      })
    })
    .catch(() => {
      return res.status(404).json({
        message: `Block not found.`,
      })
    })
}

const getBlockTransactions = async (req: Request, res: Response) => {
  const { hash, number } = req.query

  if (!hash && !number) {
    return res.status(400).json({
      message: "Query string must contain either 'hash' or 'number'.",
    })
  }

  await getBlockData(String(number), String(hash))
    .then((data) => {
      return res.json({
        data: {
          block: data.data,
        },
      })
    })
    .catch(() => {
      return res.status(404).json({
        message: `Block not found.`,
      })
    })
}

const getBlockData = async (number?: string, hash?: string) => {
  return new Promise<Block>(async (resolve, reject) => {
    let blockNumber: string | undefined

    if (number) blockNumber = number
    else if (hash) {
      try {
        blockNumber = await bhashDB.get(hash)
      } catch (err) {
        return reject(err)
      }
    }

    if (blockNumber) {
      try {
        const block = await blockDB
          .get(blockNumber)
          .then((data) => JSON.parse(data))
        return resolve(block)
      } catch (err) {
        return reject(err)
      }
    }
  })
}

export { getBlockTransactions, getBlock }
