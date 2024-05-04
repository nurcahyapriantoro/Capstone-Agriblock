import * as yup from "yup"

const signtransactionSchema = yup.object({
  privateKey: yup.string().required(),
  from: yup.string().required(),
  to: yup.string().required(),
  data: yup.object(),
  lastTransactionHash: yup.string().optional(),
})

const transactionSchema = yup.object({
  signature: yup.string().required(),
  from: yup.string().required(),
  to: yup.string().required(),
  data: yup.object(),
  lastTransactionHash: yup.string().optional(),
})

type TransactionInterface = yup.InferType<typeof transactionSchema>
type SignTransactionInterface = yup.InferType<typeof signtransactionSchema>

export {
  signtransactionSchema,
  transactionSchema,
  TransactionInterface,
  SignTransactionInterface,
}
