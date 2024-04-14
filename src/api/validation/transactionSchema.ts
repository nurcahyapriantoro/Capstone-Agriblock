import * as yup from "yup"

const transactionSchema = yup.object({
  privateKey: yup.string().required(),
  to: yup.string().required(),
  from: yup.string().required(),
  data: yup.object().nullable(),
})

export { transactionSchema }
