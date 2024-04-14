import type { Request, Response } from "express"

const getLatestBlock = (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: res.locals.chainInfo.latestBlock,
  })
}

const getMiningState = (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      isMining: res.locals.mining,
    },
  })
}

export { getLatestBlock, getMiningState }
