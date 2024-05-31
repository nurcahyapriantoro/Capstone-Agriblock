import { createHash } from "crypto"

export const cryptoHashV2 = (...args: Array<any>) => {
  const hash = createHash("sha256")

  hash.update(
    args
      .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg))
      .sort()
      .join(" ")
  )

  return hash.digest("hex")
}

export default cryptoHashV2
