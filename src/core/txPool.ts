import type { Level } from "level"
import Transaction from "../transaction"
import type { ChainInfo } from "../types"

const addTransaction = async (
  transaction: Transaction,
  chainInfo: ChainInfo,
  stateDB: Level<string, string>
) => {
  if (!transaction.isValid()) {
    console.log(
      `\x1b[31mERROR\x1b[0m [${new Date().toISOString()}] Failed to add one transaction to pool: Transaction is invalid.`
    )
    return
  }

  const txPool = chainInfo.transactionPool
  const txSenderAddress = transaction.from
  const existedAddresses = await stateDB.keys().all()

  if (!existedAddresses.includes(txSenderAddress)) {
    console.log(
      `\x1b[31mERROR\x1b[0m [${new Date().toISOString()}] Failed to add one transaction to pool: Sender does not exist.`
    )

    return
  }

  txPool.push(transaction)
  console.log(
    `\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Added one transaction to pool.`
  )
}

const clearDepreciatedTransaction = (
  prevTransactions: Array<Transaction>,
  addedTransaction: Array<Transaction>
) => {
  const addedTransactionDict = addedTransaction.reduce<Record<string, boolean>>(
    (acc, tx) => ({
      ...acc,
      [tx.signature as string]: true,
    }),
    {}
  )

  return prevTransactions.filter(
    (tx) => !addedTransactionDict[tx.signature as string]
  )
}

export { addTransaction, clearDepreciatedTransaction }
