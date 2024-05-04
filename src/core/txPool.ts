import type { Level } from "level"
import Transaction from "../transaction"
import type { ChainInfo } from "../types"

const validateTransaction = async (
  transaction: Transaction,
  chainInfo: ChainInfo,
  stateDB: Level<string, string>
): Promise<[boolean, string | undefined]> => {
  if (!transaction.isValid()) return [false, "Transaction is invalid."]

  const isAddressExist = async () => {
    const existedAddresses = await stateDB.keys().all()

    return (
      existedAddresses.includes(transaction.from) ||
      chainInfo.transactionPool.findIndex(
        (tx) => tx.to === transaction.from
      ) !== -1
    )
  }

  if (!isAddressExist()) return [false, "Sender does not exist."]

  return [true, undefined]
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

export { validateTransaction, clearDepreciatedTransaction }
