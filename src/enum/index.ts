enum MessageTypeEnum {
  HANDSHAKE = "TYPE_HANDSHAKE",
  CREATE_TRANSACTION = "TYPE_CREATE_TRANSACTION",
  PUBLISH_BLOCK = "TYPE_PUBLISH_BLOCK",
  REQUEST_BLOCK = "REQUEST_BLOCK",
  SEND_BLOCK = "SEND_BLOCK",
  START_MINING = "START_MINING",

  // DEPRECATED
  REQUEST_CHAIN = "TYPE_REQUEST_CHAIN",
  SEND_CHAIN = "TYPE_SEND_CHAIN",
}

enum TransactionTypeEnum {
  COIN_PURCHASE = "COIN_PURCHASE",
  MINING_REWARD = "MINING_REWARD",
  STAKE = "STAKE",
}

const blockchainTransactions = Object.values(TransactionTypeEnum)

export { MessageTypeEnum, TransactionTypeEnum, blockchainTransactions }
