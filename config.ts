import dotenv from "dotenv"

// Parsing the env file.
dotenv.config()

// Interface to load env variables
// Note these variables can possibly be undefined
// as someone could skip these varibales or not setup a .env file at all

interface ENV {
  NODE_ENV: string | undefined
  APP_PORT: number | undefined
  PUBLISH_KEY: string | undefined
  SUBSCRIBE_KEY: string | undefined
  SECRET_KEY: string | undefined
  USER_ID: string | undefined
}

interface Config {
  NODE_ENV: string
  APP_PORT: number
  PUBLISH_KEY: string
  SUBSCRIBE_KEY: string
  SECRET_KEY: string
  USER_ID: string
}

// Loading process.env as ENV interface

const getConfig = (): ENV => {
  return {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    APP_PORT: process.env.APP_PORT ? Number(process.env.PORT) : 3000,
    PUBLISH_KEY: process.env.PUBLISH_KEY,
    SUBSCRIBE_KEY: process.env.SUBSCRIBE_KEY,
    SECRET_KEY: process.env.SECRET_KEY,
    USER_ID: process.env.USER_ID,
  }
}

// Throwing an Error if any field was undefined we don't
// want our app to run if it can't connect to DB and ensure
// that these fields are accessible. If all is good return
// it as Config which just removes the undefined from our type
// definition.

const getSanitzedConfig = (config: ENV): Config => {
  for (const [key, value] of Object.entries(config)) {
    if (value === undefined) {
      throw new Error(`Missing key ${key} in config.env`)
    }
  }
  return config as Config
}

const config = getConfig()

const sanitizedConfig = getSanitzedConfig(config)

export default sanitizedConfig
