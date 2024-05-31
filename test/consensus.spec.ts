import { Level } from "level"
import { verifyBlock } from "../src/consensus/consensus"
import { getKeyPair } from "../utils/keypair"
import Transaction from "../src/transaction"
import Block from "../src/block"
import { GENESIS_DATA } from "../src/config"
import { ChainInfo } from "../src/types"

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

describe("Consensus", () => {
  it("should be able to verify block during consensus", async () => {
    console.log = jest.fn()
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

    const normalTransaction = new Transaction({
      from: keyPair.getPublic("hex"),
      to: keyPair.getPublic("hex"),
      data: {
        type: "NORMAL_TRANSACTION",
      },
    })
    normalTransaction.sign(keyPair)

    const block = Block.mineBlock({
      lastBlock: GENESIS_DATA,
      data: [miningTransaction, normalTransaction],
    })

    const isValidBlock = await verifyBlock(
      block,
      {
        latestBlock: GENESIS_DATA,
      } as unknown as ChainInfo,
      stateDB
    )

    expect(isValidBlock).toBeTruthy()
  })
})
