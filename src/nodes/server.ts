import WebSocket from "ws"
import { Level } from "level"
import { fork } from "child_process"

import Block from "../block"
import SyncQueue from "../core/queue"

import connect from "../../utils/connect"
import { Config } from "../../config"
import { getKeyPair } from "../../utils/keypair"
import { MessageTypeEnum } from "../enum"
import type { ChainInfo, ConnectedNode, MessageInterface } from "../types"
import Transaction from "../transaction"
import { cryptoHashV2 } from "../crypto-hash"
import { produceMessage, sendMessage } from "../../utils/message"
import { GENESIS_DATA } from "../config"
import { verifyBlock } from "../consensus/consensus"

const connectedNodes = new Map<string, ConnectedNode>()

let worker = fork(`${__dirname}/../miner/worker.js`) // Worker thread (for PoW mining).
let mined = false // This will be used to inform the node that another node has already mined before it.

const stateDB = new Level(__dirname + "/../../log/stateStore", {
  valueEncoding: "json",
})
const blockDB = new Level(__dirname + "/../../log/blockStore", {
  valueEncoding: "json",
})
const bhashDB = new Level(__dirname + "/../../log/bhashStore", {
  valueEncoding: "json",
})
const txhashDB = new Level(__dirname + "/../../log/txhashStore")

const chainInfo: ChainInfo = {
  syncQueue: new SyncQueue(),
  latestBlock: Block.genesis(),
  transactionPool: [],
  checkedBlock: {},
  latestSyncBlock: null,
}

async function startServer(params: Config) {
  const {
    PRIVATE_KEY,
    APP_PORT,
    MAX_PEERS,
    MY_ADDRESS,
    ENABLE_CHAIN_REQUEST,
    ENABLE_MINING,
  } = params

  const keyPair = getKeyPair(PRIVATE_KEY)
  const publicKey = keyPair.getPublic("hex")

  let chainRequestEnabled = ENABLE_CHAIN_REQUEST

  const server = new WebSocket.Server({
    port: APP_PORT,
  })

  process.on("uncaughtException", (err) =>
    console.log(
      `\x1b[31mERROR\x1b[0m [${new Date().toISOString()}] Uncaught Exception`,
      err
    )
  )
  console.log(
    `\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] P2P server listening on PORT`,
    APP_PORT
  )

  server.on("connection", async (socket, req) => {
    // Message handler
    socket.on("message", async (message) => {
      const _message: MessageInterface<any> = JSON.parse(message.toString())

      switch (_message.type) {
        case MessageTypeEnum.HANDSHAKE:
          const nodes: Array<string> = _message.data
          const remainingQuota = MAX_PEERS - connectedNodes.size

          const newNodes = nodes
            .filter((node) => !connectedNodes.has(node) && node !== MY_ADDRESS)
            .slice(0, remainingQuota)

          newNodes.forEach((node) =>
            connect({
              myAddress: MY_ADDRESS,
              address: node,
              connectedNodes,
            })
          )
          break

        case MessageTypeEnum.CREATE_TRANSACTION:
          if (chainRequestEnabled) break // Unsynced nodes should not be able to proceed.

          let transaction: Transaction
          try {
            transaction = new Transaction(_message.data)
          } catch (err) {
            // If transaction can not be initialized, it's faulty
            break
          }

          const getSenderAddress = async () => {
            const txSenderAddress = cryptoHashV2(transaction.from)
            return await stateDB.get(txSenderAddress)
          }
          const isTransactionExist = () =>
            [...chainInfo.transactionPool]
              .reverse()
              .findIndex(
                (tx) =>
                  tx.from === transaction.from &&
                  tx.signature === transaction.signature
              ) !== -1

          // Skip invalid transaction, empty address, and added transaction
          if (
            !transaction.isValid() ||
            !getSenderAddress() ||
            isTransactionExist()
          )
            break

          chainInfo.transactionPool.push(transaction)
          sendMessage(
            message,
            Array.from(connectedNodes.values(), (data) => data.socket)
          )

          console.log(
            `\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] New transaction received, broadcasted and added to pool.`
          )
          break

        case MessageTypeEnum.REQUEST_BLOCK:
          const { blockNumber, requestAddress } = _message.data

          let requestedBlock

          try {
            const blockData = await blockDB.get(blockNumber.toString())
            requestedBlock = blockData
          } catch (e) {
            // If block does not exist, break
            break
          }

          const node = connectedNodes.get(requestAddress)

          if (node) {
            node.socket.send(
              produceMessage(MessageTypeEnum.SEND_BLOCK, requestedBlock)
            ) // Send block

            console.log(
              `\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Sent block at position ${blockNumber} to ${requestAddress}.`
            )
          }
          break

        case MessageTypeEnum.SEND_BLOCK:
          let block: Block

          try {
            block = new Block(_message.data)
          } catch (err) {
            // If block fails to be initialized, it's faulty
            return
          }

          if (ENABLE_CHAIN_REQUEST && block.number === currentSyncBlock) {
            chainInfo.syncQueue.add(block, async function (block: Block) {
              if (
                (chainInfo.latestSyncBlock === null &&
                  GENESIS_DATA.hash === block.hash) || // For genesis
                (await verifyBlock(block, chainInfo)) // For all others
              ) {
                const blockNumberStr = block.number.toString()
                await blockDB.put(blockNumberStr, JSON.stringify(_message.data)) // Add block to chain
                await bhashDB.put(block.hash, blockNumberStr) // Assign block number to the matching block hash

                // Assign transaction index and block number to transaction hash
                for (let txIndex = 0; txIndex < block.data.length; txIndex++) {
                  const tx = block.data[txIndex]

                  await txhashDB.put(
                    tx.signature,
                    block.number.toString() + " " + txIndex.toString()
                  )
                }

                if (!chainInfo.latestSyncBlock) {
                  chainInfo.latestSyncBlock = block // Update latest synced block.
                }

                chainInfo.latestBlock = block // Update latest block cache

                console.log(
                  `\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Synced block at position ${
                    block.number
                  }.`
                )

                // Wipe sync queue
                chainInfo.syncQueue.wipe()

                currentSyncBlock++

                // Continue requesting the next block
                for (const node of [...connectedNodes.values()]) {
                  node.socket.send(
                    produceMessage(MessageTypeEnum.REQUEST_BLOCK, {
                      blockNumber: currentSyncBlock,
                      requestAddress: MY_ADDRESS,
                    })
                  )
                }

                return true
              }

              return false
            })
          }
          break
        case MessageTypeEnum.PUBLISH_BLOCK:
          let newBlock: Block

          try {
            newBlock = new Block(_message.data)
          } catch (err) {
            // If block fails to be initialized, it's faulty
            return
          }

          if (!chainInfo.checkedBlock[newBlock.hash]) {
            chainInfo.checkedBlock[newBlock.hash] = true
          } else {
            return
          }

          if (
            newBlock.lastHash !== chainInfo.latestBlock.lastHash &&
            (!chainRequestEnabled ||
              (chainRequestEnabled && currentSyncBlock > 1))
            // Only proceed if syncing is disabled or enabled but already synced at least the genesis block
          ) {
            if (await verifyBlock(newBlock, chainInfo)) {
              console.log(
                `\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] New block received.`
              )

              // If mining is enabled, we will set mined to true, informing that another node has mined before us.
              if (ENABLE_MINING) {
                mined = true

                worker.kill() // Stop the worker thread

                worker = fork(`${__dirname}/../miner/worker.js`) // Renew
              }

              const blockNumberStr = newBlock.number.toString()

              await blockDB.put(blockNumberStr, _message.data) // Add block to chain
              await bhashDB.put(newBlock.hash, blockNumberStr) // Assign block number to the matching block hash

              // Apply to all txns of the block: Assign transaction index and block number to transaction hash
              for (let txIndex = 0; txIndex < newBlock.data.length; txIndex++) {
                const tx = newBlock.data[txIndex]
                const txHash = tx.signature

                await txhashDB.put(
                  txHash,
                  blockNumberStr + " " + txIndex.toString()
                )
              }

              chainInfo.latestBlock = newBlock // Update latest block cache

              // Update the new transaction pool (remove all the transactions that are no longer valid).
              chainInfo.transactionPool = chainInfo.transactionPool.filter(
                (transaction) =>
                  !block.data.find(
                    (tx) =>
                      tx.from === transaction.from &&
                      tx.to === transaction.to &&
                      tx.signature === transaction.signature
                  )
              )

              console.log(
                `\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Block #${
                  newBlock.number
                } synced, state transited.`
              )

              sendMessage(
                message,
                Array.from(connectedNodes.values(), (data) => data.socket)
              ) // Broadcast block to other nodes

              if (ENABLE_CHAIN_REQUEST) chainRequestEnabled = false
            }
          }

          break
      }
    })
  })

  let currentSyncBlock = 1
}

export { startServer }
