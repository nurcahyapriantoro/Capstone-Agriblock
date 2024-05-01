import { cryptoHashV2 } from "../crypto-hash"

class Lot {
  publicKey: string
  iteration: number
  lastBlockHash: string

  constructor(publicKey: string, iteration: number, lastBlockHash: string) {
    this.publicKey = publicKey
    this.iteration = iteration
    this.lastBlockHash = lastBlockHash
  }

  lotHash() {
    return Array(this.iteration).reduce((prev) => {
      return cryptoHashV2(prev)
    }, this.publicKey + this.lastBlockHash)
  }
}

export default Lot
