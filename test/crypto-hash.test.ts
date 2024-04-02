import { cryptoHashV2 } from "../src/crypto-hash"

describe("cryptoHashV2", () => {
  it("generates SHA-256 hashed output", () => {
    expect(cryptoHashV2("foo")).toEqual(
      "2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae"
    )
  })

  it("product the same hash with the same input arguments", () => {
    expect(cryptoHashV2("one", "two", "three")).toEqual(
      cryptoHashV2("three", "two", "one")
    )
  })
})
