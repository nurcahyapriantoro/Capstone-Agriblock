import { ec as EC, SignatureInput } from "elliptic"

export const ec = new EC("secp256k1")

export const generateKeyPair = () => ec.genKeyPair()

export const verifyPublicKey = (
  publicKey: string,
  data: string,
  signature: SignatureInput
) => ec.keyFromPublic(publicKey, "hex").verify(data, signature)

export const getKeyPair = (privateKey: string) =>
  ec.keyFromPrivate(privateKey, "hex")
