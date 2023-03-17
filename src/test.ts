import Blockchain from "./blockchain"

const blockchain = new Blockchain()

blockchain.addBlock({ data: "initial" })

let prevStamp, nextStamp, nextBlock, timeDiff, avg

const times = []

for (let i = 0; i < 10000; i++) {
  prevStamp = blockchain.chain[blockchain.chain.length - 1].timestamp

  blockchain.addBlock({ data: `block ${i}` })

  nextBlock = blockchain.chain[blockchain.chain.length - 1]

  nextStamp = nextBlock.timestamp

  timeDiff = nextStamp - prevStamp

  times.push(timeDiff)

  avg = times.reduce((total, sum) => total + sum) / times.length
}
