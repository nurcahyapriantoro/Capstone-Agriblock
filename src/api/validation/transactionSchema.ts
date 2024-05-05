import * as yup from "yup"

const transactionSchema = yup.object({
  privateKey: yup.string().required(),
  from: yup.string().required(),
  to: yup.string().required(),
  data: yup.object(),
  lastTransactionHash: yup.string().optional(),
})

type TransactionInterface = yup.InferType<typeof transactionSchema>

export { transactionSchema, TransactionInterface }
