import Block from "../src/block"
import { cryptoHashV2 } from "../src/crypto-hash"
import { hexToBinary } from "../utils/hexToBinary"
import { GENESIS_DATA, MINE_RATE } from "../src/config"
import Transaction from "../src/transaction"
import { Level } from "level"
import { getKeyPair } from "../utils/keypair"

jest.mock("level", () => {
  const registeredAddress = [
    "040ff24e54cdfa8b5556fe71ddc0b64847a7ecf7bf8091c9907e336bb891c7a194b9fbd4c35c2d9d305ee80480101b3e2d1e74961cb740126c24dce00b93601b84", // private: 515ef035b82ab36ce9a74f15423c83923d00d37bec4c9fa7998b08def314fdc5
  ]

  class MockLevelDb {
    constructor() {}

    keys() {
      return {
        async all() {
          return Promise.resolve(registeredAddress)
        },
      }
    }

    get() {
      return Promise.resolve(
        JSON.stringify({
          balance: 10,
        })
      )
    }

    put = jest.fn()
  }

  return {
    Level: MockLevelDb,
  }
})

describe("Block", () => {
  const timestamp = 2000
  const lastHash = "foo-hash"
  const hash = "bar-hash"
  const data = ["blockchain"]
  let difficulty = 6
  let nonce = 1
  const block = new Block({
    timestamp,
    lastHash,
    hash,
    data,
    difficulty,
    nonce,
    number: 1,
  })

  beforeEach(() => {
    jest.resetModules() // Clears the module registry
    jest.clearAllMocks() // Clears all mocks
  })

  it("has timestamp, lastHash, hash, and data property", () => {
    expect(block.timestamp).toEqual(timestamp)
    expect(block.data).toEqual(data)
    expect(block.hash).toEqual(hash)
    expect(block.lastHash).toEqual(lastHash)
    expect(block.nonce).toEqual(nonce)
    expect(block.difficulty).toEqual(difficulty)
  })

  describe("genesis()", () => {
    const genesisBlock = Block.genesis()

    it("return Block instance", () => {
      expect(genesisBlock instanceof Block).toBe(true)
    })

    it("return genesis data", () => {
      expect(genesisBlock).toEqual(GENESIS_DATA)
    })
  })

  describe("mineBlock()", () => {
    console.log = jest.fn()
    const lastBlock = Block.genesis()
    const data = ["new-data", "asd"]
    const minedBlock = Block.mineBlock({ lastBlock, data })

    it("return Block instance", () => {
      expect(minedBlock instanceof Block).toBe(true)
    })

    it("set `lastHash` equals to the last block hash", () => {
      expect(minedBlock.lastHash).toEqual(lastBlock.hash)
    })

    it("set the `data`", () => {
      expect(minedBlock.data).toEqual(data)
    })

    it("set a `timeStamp`", () => {
      expect(minedBlock.timestamp).not.toEqual(undefined)
    })

    it("create SHA-256 hash based on input", () => {
      console.log(minedBlock.hash)
      expect(minedBlock.hash).toEqual(
        cryptoHashV2(
          minedBlock.timestamp,
          lastBlock.hash,
          data,
          minedBlock.nonce,
          minedBlock.difficulty
        )
      )
    })

    it("set hash matches the difficulty criteria", () => {
      expect(
        hexToBinary(minedBlock.hash).substring(0, minedBlock.difficulty)
      ).toEqual("0".repeat(minedBlock.difficulty))
    })

    it("adjusts the difficulty", () => {
      const possibleResults = [
        lastBlock.difficulty + 1,
        lastBlock.difficulty - 1,
      ]

      expect(possibleResults.includes(minedBlock.difficulty)).toBe(true)
    })
  })

  describe("adjustDifficulty()", () => {
    it("raise diffuculty for quickly mined block", () => {
      expect(
        Block.adjustDifficulty({
          originalBlock: block,
          timestamp: block.timestamp + MINE_RATE - 100,
        })
      ).toEqual(block.difficulty + 1)
    })

    it("lower diffuculty for slowly mined block", () => {
      expect(
        Block.adjustDifficulty({
          originalBlock: block,
          timestamp: block.timestamp + MINE_RATE + 100,
        })
      ).toEqual(block.difficulty - 1)
    })

    it("has lower limit 1", () => {
      block.difficulty = -1

      expect(
        Block.adjustDifficulty({ originalBlock: block, timestamp: Date.now() })
      ).toEqual(1)
    })
  })

  describe("verifyTxAndTransit()", () => {
    it("should return false if block contain invalid transaction", async () => {
      const stateDB = new Level("dummy-level")
      const transaction = new Transaction({
        from: "me",
        to: "you",
        data: "dummy-data",
      })

      const block = new Block({
        number: 2,
        timestamp: 1,
        nonce: 1,
        lastHash: "dummy-last-hash",
        hash: "dummy-hash",
        difficulty: 1,
        data: [transaction],
      })

      const isValidBlock = await Block.verifyTxAndTransit({
        block,
        stateDB,
      })

      expect(isValidBlock).toBeFalsy()
    })

    it("should return false if block contain transaction from unknown address", async () => {
      const stateDB = new Level("dummy-level")

      const keyPair = getKeyPair(
        "405f7490eb5d49ba4338cc1fc108c87ad5fc1dcc98e211c1a9919c8c19a1b7a1"
      )

      const transaction = new Transaction({
        from: keyPair.getPublic("hex"),
        to: "you",
        data: "dummy-data",
      })
      transaction.sign(keyPair)

      const block = new Block({
        number: 2,
        timestamp: 1,
        nonce: 1,
        lastHash: "dummy-last-hash",
        hash: "dummy-hash",
        difficulty: 1,
        data: [transaction],
      })

      const isValidBlock = await Block.verifyTxAndTransit({
        block,
        stateDB,
      })

      expect(isValidBlock).toBeFalsy()
    })

    it("should be able to verify and transit a valid block", async () => {
      const stateDB = new Level("dummy-level")
      const privateKey =
        "515ef035b82ab36ce9a74f15423c83923d00d37bec4c9fa7998b08def314fdc5"
      const keyPair = getKeyPair(privateKey)

      const miningTransaction = new Transaction({
        from: keyPair.getPublic("hex"),
        to: keyPair.getPublic("hex"),
        data: {
          type: "MINING_REWARD",
        },
      })
      miningTransaction.sign(keyPair)

      const coinPurchaseTransaction = new Transaction({
        from: keyPair.getPublic("hex"),
        to: keyPair.getPublic("hex"),
        data: {
          type: "COIN_PURCHASE",
          amount: 5,
        },
      })
      coinPurchaseTransaction.sign(keyPair)

      const block = Block.mineBlock({
        lastBlock: GENESIS_DATA,
        data: [miningTransaction, coinPurchaseTransaction],
      })

      const isValidBlock = await Block.verifyTxAndTransit({
        block,
        stateDB: stateDB,
      })

      expect(isValidBlock).toBeTruthy()
    })
  })
})
