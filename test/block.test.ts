import Block from "../src/block"
import cryptoHash from "../src/crypto-hash"
import { hexToBinary } from "../src/utils/hexToBinary"
import { GENESIS_DATA, MINE_RATE } from "../src/config"

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
      expect(minedBlock.hash).toEqual(
        cryptoHash(
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
})
