import Lot from "./lot"
import { stakeDb } from "../helper/level.db.client"

class ProofOfStake {
  stakers: Record<string, number>

  constructor(data: Record<string, number>) {
    this.stakers = data
  }

  static async initialize() {
    try {
      const values = await stakeDb.values().all();
      
      const stakers = values.reduce((prev, cur) => {
        // Check if cur is already an object or a string that needs parsing
        let parsedData;
        if (typeof cur === 'string') {
          try {
            parsedData = JSON.parse(cur);
          } catch (error) {
            console.error('Error parsing stake data:', error);
            return prev; // Skip this entry if it can't be parsed
          }
        } else {
          // It's already an object, use it directly
          parsedData = cur;
        }
        
        // Ensure the data has the expected structure
        if (parsedData && parsedData.publicKey && parsedData.stake !== undefined) {
          return { ...prev, [parsedData.publicKey]: parsedData.stake };
        } else {
          console.warn('Skipping invalid stake data:', parsedData);
          return prev;
        }
      }, {});
      
      return new ProofOfStake(stakers);
    } catch (error) {
      console.error('Error initializing Proof of Stake:', error);
      // Return an empty ProofOfStake instance instead of crashing
      return new ProofOfStake({});
    }
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
