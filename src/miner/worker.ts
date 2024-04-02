import Block from "../block"
import Transaction from "../transaction"

type Message = {
  type: string
  data: {
    lastBlock: Block
    transactions: Array<Transaction>
  }
}

// Miner worker thread's code.
// Listening for messages from the main process.
process.on("message", (message: Message) => {
  if (message.type === "MINE") {
    const newBlock = Block.mineBlock({
      lastBlock: message.data.lastBlock,
      data: message.data.transactions,
    })

    process.send?.({ result: newBlock })
  }
})
