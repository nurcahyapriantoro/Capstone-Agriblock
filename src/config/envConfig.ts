import dotenv from "dotenv"
import type { Peer } from "../types"

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
  PEERS: Array<Peer>
  ALLOWED_PEERS: Array<string>
  ENABLE_MINING: boolean
  ENABLE_API: boolean
  ENABLE_CHAIN_REQUEST: boolean
  IS_ORDERER_NODE: boolean
  GENESIS_PRIVATE_KEY: string

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
  PEERS: Array<Peer>
  ALLOWED_PEERS: Array<string>
  PRIVATE_KEY: string
  MY_ADDRESS: string // ws address
  ENABLE_MINING: boolean
  ENABLE_API: boolean
  ENABLE_CHAIN_REQUEST: boolean
  IS_ORDERER_NODE: boolean
  GENESIS_PRIVATE_KEY: string

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
  const getPeers = (data?: string): Array<Peer> => {
    if (!data) return []

    try {
      const peers = JSON.parse(data)
      return peers
    } catch (err) {
      return []
    }
  }

  const getAllowedPeers = (data?: string): Array<string> => {
    if (!data) return []

    return data.split(",")
  }

  return {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    APP_PORT: process.env.APP_PORT ? Number(process.env.APP_PORT) : 3000,
    API_PORT: process.env.API_PORT ? Number(process.env.API_PORT) : 5000,
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    MY_ADDRESS: process.env.MY_ADDRESS,
    PEERS: getPeers(process.env.PEERS),
    ALLOWED_PEERS: getAllowedPeers(process.env.ALLOWED_PEERS),
    ENABLE_CHAIN_REQUEST: process.env.ENABLE_CHAIN_REQUEST === "true",
    ENABLE_API: process.env.ENABLE_API === "true",
    ENABLE_MINING: process.env.ENABLE_MINING === "true",
    IS_ORDERER_NODE: process.env.IS_ORDERED_NODE === "true",
    GENESIS_PRIVATE_KEY: process.env.GENESIS_PRIVATE_KEY as string,

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
