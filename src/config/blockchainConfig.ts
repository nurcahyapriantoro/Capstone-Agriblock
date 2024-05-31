import { generateKeyPair } from "../../utils/keypair"

const MINT_KEY_PAIR = generateKeyPair()
const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic("hex")
const INITIAL_SUPPLY = 1000000
const MINE_RATE = 6000
const INITIAL_DIFFICULTY = 3
const MINE_REWARD = 100

const GENESIS_DATA = {
  timestamp: 1,
  lastHash: "----",
  hash: "033e0c1d8ace37e628eb8c515a211fa400fa7c17d705acebb2552df401a88dc2",
  difficulty: INITIAL_DIFFICULTY,
  nonce: 12,
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
