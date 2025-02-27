import { defineConfig } from "../utils/defineConfig"

export function createNode1Config() {
  return defineConfig({
    NODE_ENV: "development",
    APP_PORT: 3001,
    API_PORT: 5001,
    PRIVATE_KEY:
      "a8acad8b4509d7e42a63e695cca4eb995a98bc635406f025e3274abab02e5b88",
    // PUBLIC_KEY: "04fec2a17359838535c1a64989c11031574909db1aa405a0c4ca2ce7346639d7e0b2edaf335fc040c119a8e474bb3bb3a20dfd3b48417c66c29fdcab7ae7fbe9d5",
    GENESIS_PRIVATE_KEY:
      "ad5a70855d86761e227f5100512e55e064e7b284ab89aad1c04347e5c520a2a4",
    MY_ADDRESS: "ws://localhost:3001",
    PEERS: [
      {
        publicKey:
          "047ef91754d9e78767be0abfa8cec958e8f335e042150e9cc56501df222d04a22ef0509151f15c4caa9d45ba2876d3cf0cf181732e20129c06643d8ed9ee00f6b4",
        wsAddress: "ws://localhost:3000",
      },
    ],
    ALLOWED_PEERS: [
      "047ef91754d9e78767be0abfa8cec958e8f335e042150e9cc56501df222d04a22ef0509151f15c4caa9d45ba2876d3cf0cf181732e20129c06643d8ed9ee00f6b4",
      "0401f67cf6a8787ec26ec561cfc3208388b94b934fb74caecca25caeb12c5c99babdf5604fb703ddd7aca4bbc90a3ee8eb6c86183707d2cee9fa93c500bc1323bd",
      "04831c0c25f5092604af3d1a5655e116ec0eb02b1343b525de662a6e3dd4b0fda6dc0ad842808a7e0c1ecc0cc9846ca0a6fc8a30490dabf6f6c6c7893252d0a77e",
    ],
    ENABLE_CHAIN_REQUEST: true,
    ENABLE_API: true,
    ENABLE_MINING: true,
    IS_ORDERER_NODE: false,

    // other settings, can ignore
    PUBLISH_KEY: "pub-c-8ce41d95-7641-440b-a62b-ac6499c142d2",
    SUBSCRIBE_KEY: "sub-c-f3c9b7f8-49bc-4be4-abb7-0918e9178720",
    SECRET_KEY: "sec-c-MGUxOGU1NGYtNTE0OS00ODUxLTlkODAtMjlkYjIyMDFiNWM1",
    USER_ID: "agrichain",
  })
}
