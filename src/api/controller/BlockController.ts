import type { Request, Response } from "express"
import { blockDB } from "../../helper/level.db.client"

const getBlocks = async (req: Request, res: Response) => {
  const blocks = await blockDB.values().all()
  res.json({
    data: blocks,
  })
}

const getBlockByHash = async (req: Request, res: Response) => {
  const { hash } = req.params

  try {
    const block = await blockDB.get(hash)
    res.json({
      data: JSON.parse(block),
    })
  } catch (err) {
    res.status(404).json({
      message: "Block not found",
    })
  }
}
export { getBlockByHash, getBlocks }
