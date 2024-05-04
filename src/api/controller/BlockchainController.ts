import type { Request, Response } from "express"
import { blockDB } from "../../helper/level.db.client"

const getLastBlock = async (req: Request, res: Response) => {
  const blockKeys = await blockDB.keys().all()
  const lastStoredBlockKey = Math.max(...blockKeys.map((key) => parseInt(key)))

  const lastblock = await blockDB
    .get(lastStoredBlockKey.toString())
    .then((data) => JSON.parse(data))

  res.json({
    data: {
      block: lastblock,
    },
  })
}

const getTotalBlock = async (req: Request, res: Response) => {
  const blockKeys = await blockDB.keys().all()

  res.json({
    data: {
      totalBlock: blockKeys.length,
    },
  })
}

export { getLastBlock, getTotalBlock }
