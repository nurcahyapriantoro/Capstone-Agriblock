import Lot from "../src/consensus/lot"

describe("Lot", () => {
  it("should return lot hash", () => {
    const lot1 = new Lot("publicKey", 1, "lastBlockHash")
    const lot10 = new Lot("publicKey", 12, "lastBlockHash")

    console.log(lot1.lotHash())
    console.log(lot10.lotHash())

    expect(lot1).not.toEqual(lot10)
  })
})
