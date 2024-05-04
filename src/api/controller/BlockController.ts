import type { Request, Response } from "express"
import { bhashDB, blockDB } from "../../helper/level.db.client"

const getBlock = async (req: Request, res: Response) => {
  const { hash } = req.params

  try {
    const blockNumber = await bhashDB.get(String(hash))

    const block = await blockDB.get(blockNumber)

    res.json({
      data: {
        block: JSON.parse(block),
      },
    })
  } catch (err) {
    res.status(404).json({
      message: "Block not found",
    })
  }
}

const getBlockTransactions = async (req: Request, res: Response) => {
  const { hash } = req.params

  try {
    const blockNumber = await bhashDB.get(String(hash))

    const block = await blockDB
      .get(blockNumber)
      .then((block) => JSON.parse(block))

    res.json({
      data: {
        transactions: block.data,
      },
    })
  } catch (err) {
    res.status(404).json({
      message: "Block not found",
    })
  }
}

export { getBlock, getBlockTransactions }
