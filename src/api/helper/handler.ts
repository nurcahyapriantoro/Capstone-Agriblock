import createHttpError from "http-errors"

const catcher =
  (fn: Function) =>
  (...args: any) => {
    const next = args[args.length - 1]
    return Promise.resolve(fn(...args)).catch((error) => {
      next(createHttpError(error))
    })
  }

export default catcher
