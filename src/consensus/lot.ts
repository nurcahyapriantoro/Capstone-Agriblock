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
    return Array.from({ length: this.iteration }).reduce<string>(
      (prev) => cryptoHashV2(prev),
      this.publicKey + this.lastBlockHash
    )
  }
}

export default Lot
