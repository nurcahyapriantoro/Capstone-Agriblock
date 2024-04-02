import { startServer } from "./src/nodes/server"
import sanitizedConfig from "./config"
;(async () => {
  await startServer(sanitizedConfig)
})()
