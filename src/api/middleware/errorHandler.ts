import type { ErrorRequestHandler } from "express"

const handleError: ErrorRequestHandler = async (err, req, res, _next) => {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get("env") === "development" ? err : {}

  console.log(err)

  res.status(err.status || 500).json({
    success: false,
    message: res.locals.message,
    error: res.locals.error,
  })
}

export default handleError
