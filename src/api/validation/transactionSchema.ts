import * as yup from "yup"

const transactionSchema = yup.object({
  privateKey: yup.string().optional(),
  from: yup.string().required(),
  to: yup.string().required(),
  data: yup.object(),
  lastTransactionHash: yup.string().optional(),
  signature: yup.string().optional(),
})

const singTransactionSchema = yup.object({
  privateKey: yup.string().required(),
  from: yup.string().required(),
  to: yup.string().required(),
  data: yup.object(),
  lastTransactionHash: yup.string().optional(),
})

const coinTransferSchema = yup.object({
  privateKey: yup.string().required(),
  address: yup.string().required(),
  amount: yup.number().required(),
})

const coinStakeSchema = yup.object({
  privateKey: yup.string().required(),
  amount: yup.number().required(),
})

type TransactionInterface = yup.InferType<typeof transactionSchema>
type SignTransactionInterface = yup.InferType<typeof singTransactionSchema>
type CoinTransferInterface = yup.InferType<typeof coinTransferSchema>
type CoinStakeInterface = yup.InferType<typeof coinStakeSchema>

export {
  transactionSchema,
  coinTransferSchema,
  coinStakeSchema,
  SignTransactionInterface,
  TransactionInterface,
  CoinTransferInterface,
  CoinStakeInterface,
}
