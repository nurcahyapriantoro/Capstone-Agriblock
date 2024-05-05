import ProofOfStake from "../src/consensus/pos"
import { cryptoHashV2 } from "../src/crypto-hash"

jest.mock("level", () => {
  const stakers = [
    {
      publicKey: "bob",
      stake: 50,
    },
    { publicKey: "dyland", stake: 100 },
  ]

  class MockLevelDb {
    constructor() {}

    values() {
      return {
        async all() {
          return Promise.resolve(
            stakers.map((staker) => JSON.stringify(staker))
          )
        },
      }
    }

    put = jest.fn()
  }

  return {
    Level: MockLevelDb,
  }
})
describe("Proof of Stake", () => {
  afterEach(() => {
    jest.resetModules()
  })

  it("should be able to initialized", async () => {
    const consensusProtocol = await ProofOfStake.initialize()

    expect(consensusProtocol.stakers).toEqual({
      bob: 50,
      dyland: 100,
    })
  })

  it("should be able to update balance", async () => {
    const consensusProtocol = await ProofOfStake.initialize()

    consensusProtocol.update("bob", 50)
    expect(consensusProtocol.get("bob")).toEqual(100)
  })

  it("should be able to select the next forger", async () => {
    const consensusProtocol = await ProofOfStake.initialize()

    const nextForger = await consensusProtocol.forger(cryptoHashV2("winner"))

    expect(nextForger).toBe("dyland")
  })
})
