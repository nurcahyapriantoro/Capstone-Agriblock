import 'reflect-metadata';
import { startServer } from "./src/nodes/server"

import { appConfig } from "./src/config"
;(async () => {
  await startServer(appConfig)
})()
