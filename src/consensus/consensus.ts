import Block from "../block"

import { ChainInfo } from "../types"
import { cryptoHashV2 } from "../crypto-hash"
import { hexToBinary } from "../../utils/hexToBinary"
import type { Level } from "level"

async function verifyBlock(
  newBlock: Block,
  chainInfo: ChainInfo,
  stateDB: Level<string, string>
) {
  const checkHash = () => {
    return (
      cryptoHashV2(
        newBlock.timestamp,
        newBlock.lastHash,
        newBlock.data,
        newBlock.nonce,
        newBlock.difficulty
      ) === newBlock.hash
    )
  }

  return (
    // Check hash
    checkHash() &&
    chainInfo.latestBlock.hash === newBlock.lastHash &&
    // Check proof of work
    hexToBinary(newBlock.hash).substring(0, newBlock.difficulty) ===
      "0".repeat(newBlock.difficulty) &&
    // Check transactions
    newBlock.data.every((tx) => tx.isValid()) &&
    // Check timestamp
    newBlock.timestamp > chainInfo.latestBlock.timestamp &&
    newBlock.timestamp < Date.now() &&
    // Check block number
    newBlock.number - 1 === chainInfo.latestBlock.number &&
    // Check transactions and transit state right after
    (await Block.verifyTxAndTransit({ block: newBlock, stateDB }))
  )
}

export { verifyBlock }
