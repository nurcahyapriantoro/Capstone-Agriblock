import createHttpError from "http-errors"
import type { AnySchema } from "yup"
import type { Request, Response, NextFunction } from "express"

const validate =
  (schema: AnySchema) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.validate(req.body)
      next()
    } catch (err: any) {
      next(createHttpError(400, err.message))
    }
  }

export default validate
