import { Level } from "level"
import Block from "../block"

type DBType = Level<string, string>

const changeState = async (newBlock: Block, stateDB: DBType) => {
  // Manually change state
  const existedAddresses = await stateDB.keys().all()

  for (const tx of newBlock.data) {
    // If the address doesn't already exist in the chain state, we will create a new empty one.
    if (!existedAddresses.includes(tx.to)) {
      await stateDB.put(
        tx.to,
        // TODO: update implementation
        JSON.stringify({
          name: "receiver",
        })
      )
    }

    // If the address doesn't already exist in the chain state, we will create a new empty one.
    if (!existedAddresses.includes(tx.from)) {
      await stateDB.put(
        tx.from,
        // TODO: update implementation
        JSON.stringify({
          name: "sender",
        })
      )
    }
  }

  // Reward
  const rewardTransaction = newBlock.data[0]
  const totalTransaction = newBlock.data.length - 1

  if (!existedAddresses.includes(rewardTransaction.to)) {
    await stateDB.put(
      rewardTransaction.to,
      // TODO: update implementation
      JSON.stringify({
        name: "miner",
        balance: totalTransaction,
      })
    )
  } else {
    const minerState = await stateDB
      .get(rewardTransaction.to)
      .then((data) => JSON.parse(data))

    await stateDB.put(
      rewardTransaction.to,
      JSON.stringify({
        ...minerState,
        balance: minerState.balance + totalTransaction,
      })
    )
  }
}

export default changeState
