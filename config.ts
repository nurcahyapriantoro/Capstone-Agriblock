import dotenv from "dotenv"

// Parsing the env file.
dotenv.config()

// Interface to load env variables
// Note these variables can possibly be undefined
// as someone could skip these varibales or not setup a .env file at all

export interface ENV {
  NODE_ENV: string | undefined
  APP_PORT: number | undefined
  API_PORT: number | undefined
  PRIVATE_KEY: string | undefined
  MY_ADDRESS: string | undefined
  PEERS: Array<string>
  MAX_PEERS: number
  ENABLE_MINING: boolean
  ENABLE_API: boolean
  ENABLE_CHAIN_REQUEST: boolean

  // other settings
  PUBLISH_KEY: string | undefined
  SUBSCRIBE_KEY: string | undefined
  SECRET_KEY: string | undefined
  USER_ID: string | undefined

  /*
    need to explore
    ENABLE_LOGGING: boolean
  */
}

export interface Config {
  NODE_ENV: string
  APP_PORT: number
  API_PORT: number
  PEERS: Array<string>
  MAX_PEERS: number
  PRIVATE_KEY: string
  MY_ADDRESS: string
  ENABLE_MINING: boolean
  ENABLE_API: boolean
  ENABLE_CHAIN_REQUEST: boolean

  // other settings
  PUBLISH_KEY: string
  SUBSCRIBE_KEY: string
  SECRET_KEY: string
  USER_ID: string

  /*
    need to explore
    ENABLE_LOGGING: boolean
  */
}

// Loading process.env as ENV interface
const getConfig = (): ENV => {
  return {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    APP_PORT: process.env.APP_PORT ? Number(process.env.APP_PORT) : 3000,
    API_PORT: process.env.API_PORT ? Number(process.env.API_PORT) : 5000,
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    MY_ADDRESS: process.env.MY_ADDRESS,
    MAX_PEERS: process.env.MAX_PEERS ? Number(process.env.MAX_PEERS) : 10,
    PEERS: process.env.PEERS ? process.env.PEERS.split(",") : [],
    ENABLE_CHAIN_REQUEST: process.env.ENABLE_CHAIN_REQUEST === "true",
    ENABLE_API: process.env.ENABLE_API === "true",
    ENABLE_MINING: process.env.ENABLE_MINING === "true",

    // other settings
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
