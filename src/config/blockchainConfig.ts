import { generateKeyPair } from "../../utils/keypair"

const MINT_KEY_PAIR = generateKeyPair()
const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic("hex")
const FIRST_ACCOUNT =
  "52472d59e3c01bc2cf9496c959d924ce5f469d4e097c395f5605f70633e44a28"
const INITIAL_SUPPLY = 1000000
const MINE_RATE = 1000
const INITIAL_DIFFICULTY = 3
const MINE_REWARD = 100

const GENESIS_DATA = {
  timestamp: 1,
  lastHash: "----",
  hash: "hash-one",
  difficulty: INITIAL_DIFFICULTY,
  nonce: 0,
  data: [],
  number: 1,
}

export {
  GENESIS_DATA,
  MINE_RATE,
  MINE_REWARD,
  MINT_KEY_PAIR,
  MINT_PUBLIC_ADDRESS,
  FIRST_ACCOUNT,
  INITIAL_SUPPLY,
}
