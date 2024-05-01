import sanitizedConfig from "./envConfig"
import { createNode1Config, createNode2Config, createNode3Config } from "./envs"

function getConfig() {
  switch (process.env.APP_ENV) {
    // NOTES: Custom app env for testing purposes
    case "node-1":
      return createNode1Config()
    case "node-2":
      return createNode2Config()
    case "node-3":
      return createNode3Config()
    default:
      return sanitizedConfig
  }
}

export const appConfig = getConfig()
