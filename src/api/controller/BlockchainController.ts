import type { Request, Response } from "express"
import { blockDB, txhashDB } from "../../helper/level.db.client"

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

const getBlockchainState = async (_req: Request, res: Response) => {
  const blockKeys = await blockDB.keys().all()
  const txKeys = await txhashDB.keys().all()

  res.json({
    data: {
      totalBlock: blockKeys.length,
      totalTransaction: txKeys.length,
    },
  })
}

export { getLastBlock, getBlockchainState }
