import Lot from "./lot"
import { distance } from "fastest-levenshtein"

class ProofOfStake {
  stakers: Record<string, number>

  constructor() {
    this.stakers = {}
  }

  update(publicKey: string, stake: number) {
    if (this.stakers[publicKey]) this.stakers[publicKey] += stake
    else this.stakers[publicKey] = stake
  }

  get(publicKey: string) {
    if (this.stakers[publicKey]) return this.stakers[publicKey]
    else return null
  }

  validatorLots(seed: string) {
    return Object.keys(this.stakers).flatMap((stakeKey) =>
      Array.from(
        { length: this.stakers[stakeKey] },
        (_, i) => new Lot(stakeKey, i + 1, seed)
      )
    )
  }

  winnerLot(lots: Array<Lot>, seed: string) {
    const { winnerLot } = lots.reduce<{
      winnerLot: Lot | null
      leastOffSet: number | null
    }>(
      (prev, lot) => {
        const offSet = distance(seed, lot.lotHash())

        if (prev.leastOffSet === null || offSet < prev.leastOffSet) {
          return {
            winnerLot: lot,
            leastOffSet: offSet,
          }
        }

        return prev
      },
      {
        winnerLot: null,
        leastOffSet: null,
      }
    )

    return winnerLot
  }

  forger(lastBlockHash: string) {
    const lots = this.validatorLots(lastBlockHash)
    const winnerLot = this.winnerLot(lots, lastBlockHash)

    return winnerLot?.publicKey
  }
}

export default ProofOfStake
