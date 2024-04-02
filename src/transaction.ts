import { ec } from "elliptic"
import { TransactionInterface } from "./types"
import cryptoHash from "./crypto-hash"
import { verifyPublicKey } from "../utils/keypair"
import { MINT_PUBLIC_ADDRESS } from "./config"

interface TransactionParams extends TransactionInterface {
  signature?: string
}
class Transaction {
  from: string
  to: string
  signature: string | null
  data: any

  constructor({ from, to, data, signature }: TransactionParams) {
    this.from = from
    this.to = to
    this.data = data
    this.signature = signature ?? null
  }

  sign(keyPair: ec.KeyPair) {
    if (keyPair.getPublic("hex") === this.from) {
      this.signature = keyPair
        .sign(cryptoHash(this.from, this.to, this.data))
        .toDER("hex")
    }
  }

  isValid() {
    return (
      this.from === MINT_PUBLIC_ADDRESS ||
      (this.signature &&
        verifyPublicKey(
          this.from,
          cryptoHash(this.from, this.to, this.data),
          this.signature
        ))
    )
  }
}

export default Transaction
