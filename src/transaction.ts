import { ec } from "elliptic"
import { TransactionInterface } from "./types"
import { cryptoHashV2 } from "./crypto-hash"
import { verifyPublicKey } from "../utils/keypair"

interface TransactionParams extends TransactionInterface {
  signature?: string
}
class Transaction {
  from: string // sender adress
  to: string // receiver address
  // NOTES: used to link between transaction, get information about last transaction (block hash and transaction number)
  lastTransactionHash?: string
  signature?: string
  data: any

  constructor({
    from,
    to,
    data,
    signature,
    lastTransactionHash,
  }: TransactionParams) {
    this.from = from
    this.to = to
    this.data = data
    this.lastTransactionHash = lastTransactionHash
    this.signature = signature
  }

  sign(keyPair: ec.KeyPair) {
    if (keyPair.getPublic("hex") === this.from) {
      this.signature = keyPair.sign(this.getHash()).toDER("hex")
    } else {
      throw "Invalid private key!"
    }
  }

  isValid() {
    return (
      this.signature &&
      verifyPublicKey(this.from, this.getHash(), this.signature)
    )
  }

  getHash() {
    return cryptoHashV2(this.from, this.to, this.data, this.lastTransactionHash)
  }
}

export default Transaction
