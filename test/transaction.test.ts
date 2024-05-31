import { cryptoHashV2 } from "../src/crypto-hash"
import Transaction from "../src/transaction"
import { generateKeyPair } from "../utils/keypair"

describe("Transaction", () => {
  it("should be able to sign transaction", () => {
    const keyPair = generateKeyPair()

    const transaction = new Transaction({
      from: keyPair.getPublic("hex"),
      to: "you",
      data: {
        type: "TRANSFER_COIN",
        amount: 100,
      },
    })
    expect(transaction.signature).toBeUndefined()

    transaction.sign(keyPair)
    expect(transaction.signature).toBeDefined()
  })

  it("should be able to validate transaction", () => {
    const keyPair = generateKeyPair()

    const transaction = new Transaction({
      from: keyPair.getPublic("hex"),
      to: "you",
      data: {
        type: "TRANSFER_COIN",
        amount: 100,
      },
    })
    transaction.sign(keyPair)

    expect(transaction.isValid()).toBeTruthy()
  })

  it("should be able to get transaction hash", () => {
    const transaction = new Transaction({
      from: "me",
      to: "you",
      data: {
        type: "TRANSFER_COIN",
        amount: 100,
      },
    })

    const txHash = transaction.getHash()

    expect(txHash).toEqual(
      cryptoHashV2(
        transaction.from,
        transaction.to,
        transaction.data,
        transaction.lastTransactionHash
      )
    )
  })
})
