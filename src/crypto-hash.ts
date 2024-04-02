import { createHmac, createHash } from "crypto"

const cryptoHash = (...args: Array<any>) => {
  const hmac = createHmac("sha256", args.join(" "))

  return hmac.digest("hex")
}

export const cryptoHashV2 = (...args: Array<any>) => {
  const hash = createHash("sha256")

  hash.update(args.sort().join(" "))

  return hash.digest("hex")
}

export default cryptoHash
