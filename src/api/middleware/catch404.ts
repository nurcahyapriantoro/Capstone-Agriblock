import createError from "http-errors"
import type { Request, Response, NextFunction } from "express"

const catch404Error = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  next(
    createError(404, `${req.path} doesn't exist`, {
      path: req.path,
      method: req.method,
    })
  )
}

export default catch404Error
