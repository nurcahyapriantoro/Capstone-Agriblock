import WebSocket from "ws"
import { Level } from "level"
import { fork } from "child_process"

import Block from "../block"
import Transaction from "../transaction"
import SyncQueue from "../core/queue"
import changeState from "../core/state"

import connect from "../../utils/connect"
import { Config } from "../../config"
import { getKeyPair } from "../../utils/keypair"
import { MessageTypeEnum } from "../enum"
import { produceMessage, sendMessage } from "../../utils/message"
import { GENESIS_DATA, MINT_PUBLIC_ADDRESS } from "../config"
import { verifyBlock } from "../consensus/consensus"
import type { ChainInfo, ConnectedNode, MessageInterface } from "../types"

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
    PEERS,
    ENABLE_CHAIN_REQUEST,
    ENABLE_MINING,
    ENABLE_RPC,
  } = params

  const keyPair = getKeyPair(PRIVATE_KEY)
  const publicKey = keyPair.getPublic("hex")

  let chainRequestEnabled = ENABLE_CHAIN_REQUEST
  let currentSyncBlock = 1

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
            return await stateDB.get(transaction.from)
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
                (await verifyBlock(block, chainInfo, stateDB)) // For all others
              ) {
                const blockNumberStr = block.number.toString()
                await blockDB.put(blockNumberStr, JSON.stringify(_message.data)) // Add block to chain
                await bhashDB.put(block.hash, blockNumberStr) // Assign block number to the matching block hash

                // Assign transaction index and block number to transaction hash
                for (let txIndex = 0; txIndex < block.data.length; txIndex++) {
                  const tx = block.data[txIndex]

                  await txhashDB.put(
                    tx.signature as string,
                    block.number.toString() + " " + txIndex.toString()
                  )
                }

                if (!chainInfo.latestSyncBlock) {
                  chainInfo.latestSyncBlock = block // Update latest synced block.

                  await changeState(block, stateDB) // Force transit state
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
            if (await verifyBlock(newBlock, chainInfo, stateDB)) {
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
                  txHash as string,
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

  if (!chainRequestEnabled) {
    const blockchain = await blockDB.values().all()

    if ((blockchain.length as number) === 0) {
      /*
        register the first account
        // await stateDB.put()
      */

      // store genesis block
      await blockDB.put(
        chainInfo.latestBlock.number.toString(),
        JSON.stringify(chainInfo.latestBlock)
      )

      // assign block number to the matching block hash
      await bhashDB.put(
        chainInfo.latestBlock.hash,
        chainInfo.latestBlock.number.toString()
      )

      await changeState(chainInfo.latestBlock, stateDB)

      console.log(
        `\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Created Genesis Block with:\n` +
          `    Block number: ${chainInfo.latestBlock.number.toString()}\n` +
          `    Timestamp: ${chainInfo.latestBlock.timestamp.toString()}\n` +
          `    Difficulty: ${chainInfo.latestBlock.difficulty.toString()}\n` +
          `    Hash: ${chainInfo.latestBlock.hash.toString()}\n`
      )
    } else {
      const lastStoredBlockKey = Math.max(
        ...blockchain.map((key) => parseInt(key))
      )
      chainInfo.latestBlock = await blockDB
        .get(lastStoredBlockKey.toString())
        .then((data) => JSON.parse(data))
    }
  }

  try {
    PEERS.forEach((peer) =>
      connect({
        address: peer,
        myAddress: MY_ADDRESS,
        connectedNodes,
      })
    ) // Connect to peers
  } catch (e) {}

  // Sync chain
  if (chainRequestEnabled) {
    const blockNumbers = await blockDB.keys().all()

    if ((blockNumbers.length as number) !== 0) {
      currentSyncBlock = Math.max(...blockNumbers.map((key) => parseInt(key)))
    }

    if (currentSyncBlock === 1) {
      /*
        // Initial state

        register the first account
        // await stateDB.put()
      */
    }

    setTimeout(async () => {
      for (const node of [...connectedNodes.values()]) {
        node.socket.send(
          produceMessage(MessageTypeEnum.REQUEST_BLOCK, {
            blockNumber: currentSyncBlock,
            requestAddress: MY_ADDRESS,
          })
        )
      }
    }, 5000)
  }

  // mining scheduler
  if (ENABLE_MINING) {
    let length = chainInfo.latestBlock.number
    let mining = true

    setInterval(async () => {
      if (mining || length !== chainInfo.latestBlock.number) {
        mining = false
        length = chainInfo.latestBlock.number

        if (!ENABLE_CHAIN_REQUEST) await mine(publicKey)
      }
    }, 1000)
  }

  if (ENABLE_RPC) {
  }
}

const mine = async (publicKey: string) => {
  const startWorker = (lastBlock: Block, transactions: Array<Transaction>) => {
    return new Promise<Block>((resolve, reject) => {
      worker.addListener("message", (message: any) => resolve(message.result))

      worker.send({
        type: "MINE",
        data: {
          lastBlock,
          transactions,
        },
      }) // Send a message to the worker thread, asking it to mine.
    })
  }

  const rewardTransaction = new Transaction({
    from: MINT_PUBLIC_ADDRESS,
    to: publicKey,
    data: [],
  })

  // Collect a list of transactions to mine
  const states: Record<string, any> = {}
  const transactionsToMine = [rewardTransaction]

  const existedAddresses = await stateDB.keys().all()

  for (const tx of chainInfo.transactionPool) {
    const txSenderAddress = tx.from

    // Normal coin transfers
    if (!states[txSenderAddress]) {
      const senderState = await stateDB
        .get(txSenderAddress)
        .then((data) => JSON.parse(data))

      states[txSenderAddress] = senderState
    } else {
      // update sender address data
    }

    if (!existedAddresses.includes(tx.to) && !states[tx.to]) {
      states[tx.to] = {
        name: "receiver",
      }
    }

    if (existedAddresses.includes(tx.to) && !states[tx.to]) {
      states[tx.to] = await stateDB.get(tx.to).then((data) => JSON.parse(data))
    }

    // update recipient address data
    transactionsToMine.push(tx)
  }

  // Mine the block.
  startWorker(chainInfo.latestBlock, transactionsToMine)
    .then(async (result) => {
      // If the block is not mined before, we will add it to our chain and broadcast this new block.
      if (!mined) {
        await blockDB.put(result.number.toString(), JSON.stringify(result)) // Add block to chain
        await bhashDB.put(result.hash, result.number.toString()) // Assign block number to the matching block hash

        // Assign transaction index and block number to transaction hash
        for (let txIndex = 0; txIndex < result.data.length; txIndex++) {
          const tx = result.data[txIndex]
          const txHash = tx.signature as string

          await txhashDB.put(
            txHash,
            result.number.toString() + " " + txIndex.toString()
          )
        }

        chainInfo.latestBlock = result // Update latest block cache

        // Reward
        const rewardTransaction = result.data[0]
        if (!existedAddresses.includes(rewardTransaction.to)) {
          states[rewardTransaction.to] = {
            name: "miner",
          }
        }

        if (existedAddresses.includes(rewardTransaction.to)) {
          states[rewardTransaction.to] = await stateDB
            .get(rewardTransaction.to)
            .then((data) => JSON.parse(data))
        }

        for (const account of Object.keys(states))
          await stateDB.put(account, JSON.stringify(states[account]))

        // Update the new transaction pool (remove all the transactions that are no longer valid).
        chainInfo.transactionPool = chainInfo.transactionPool.filter(
          (transaction) =>
            !result.data.find(
              (tx) =>
                tx.from === transaction.from &&
                tx.to === transaction.to &&
                tx.signature === transaction.signature
            )
        )

        sendMessage(
          produceMessage(MessageTypeEnum.PUBLISH_BLOCK, result),
          [...connectedNodes.values()].map((node) => node.socket)
        ) // Broadcast the new block

        console.log(
          `\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Block #${
            chainInfo.latestBlock.number
          } mined and synced, state transited.`
        )
      } else {
        mined = false
      }

      // Re-create the worker thread
      worker.kill()

      worker = fork(`${__dirname}/../miner/worker.js`)
    })
    .catch((err) =>
      console.log(
        `\x1b[31mERROR\x1b[0m [${new Date().toISOString()}] Error at mining child process`,
        err
      )
    )
}

export { startServer }
