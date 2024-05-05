import { generateKeyPair } from "../../utils/keypair"

const MINT_KEY_PAIR = generateKeyPair()
const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic("hex")
const INITIAL_SUPPLY = 1000000
const MINE_RATE = 1000
const INITIAL_DIFFICULTY = 3
const MINE_REWARD = 100

const GENESIS_DATA = {
  timestamp: 1,
  lastHash: "----",
  hash: "f818c7b8df6639e56317cdd4f414154202bfd4e4c0bfba0084ef6ab0a78ad510",
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
  INITIAL_SUPPLY,
}
