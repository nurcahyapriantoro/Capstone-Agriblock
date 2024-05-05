import Lot from "./lot"
import { stakeDb } from "../helper/level.db.client"

class ProofOfStake {
  stakers: Record<string, number>

  constructor(data: Record<string, number>) {
    this.stakers = data
  }

  static async initialize() {
    const stakers = await stakeDb
      .values()
      .all()
      .then((data) =>
        data.reduce((prev, cur) => {
          const parsedData = JSON.parse(cur)
          return { ...prev, [parsedData.publicKey]: parsedData.stake }
        }, {})
      )

    return new ProofOfStake(stakers)
  }

  async update(publicKey: string, stake: number) {
    if (this.stakers[publicKey]) this.stakers[publicKey] += stake
    else this.stakers[publicKey] = stake

    await stakeDb.put(
      publicKey,
      JSON.stringify({ publicKey, stake: this.stakers[publicKey] })
    )
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
    const referenceHashInt = parseInt(seed, 16)

    const { winnerLot } = lots.reduce<{
      winnerLot: Lot | null
      leastOffSet: number | null
    }>(
      (prev, lot) => {
        const lotHashInt = parseInt(lot.lotHash(), 16)

        const offSet = Math.abs(lotHashInt - referenceHashInt)

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
