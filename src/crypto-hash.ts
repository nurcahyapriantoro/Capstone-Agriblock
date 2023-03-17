import { createHmac } from "crypto"

const cryptoHash = (...args: Array<any>) => {
  const hmac = createHmac("sha256", args.join(" "))

  return hmac.digest("hex")
}

export default cryptoHash
