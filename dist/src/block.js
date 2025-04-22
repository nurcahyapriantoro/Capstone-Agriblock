"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const crypto_hash_1 = require("./crypto-hash");
const hexToBinary_1 = require("../utils/hexToBinary");
const enum_1 = require("./enum");
class Block {
    constructor({ timestamp, lastHash, hash, data, difficulty, nonce, number, }) {
        this.timestamp = timestamp;
        this.lastHash = lastHash;
        this.hash = hash;
        this.data = data;
        this.difficulty = difficulty;
        this.nonce = nonce;
        this.number = number;
    }
    static genesis() {
        return new this(config_1.GENESIS_DATA);
    }
    static mineBlock({ lastBlock, data, }) {
        const lastHash = lastBlock.hash;
        let hash, timestamp;
        let { difficulty } = lastBlock;
        let nonce = 0;
        const dataString = JSON.stringify(data);
        do {
            nonce++;
            timestamp = Date.now();
            difficulty = Block.adjustDifficulty({
                originalBlock: lastBlock,
                timestamp,
            });
            hash = (0, crypto_hash_1.cryptoHashV2)(timestamp, lastHash, dataString, nonce, difficulty);
            console.log(`difficulty ${difficulty}, timestamp ${timestamp}, nonce ${nonce}, hash ${hash}`);
        } while ((0, hexToBinary_1.hexToBinary)(hash).substring(0, difficulty) !== "0".repeat(difficulty));
        return new this({
            timestamp,
            lastHash,
            data,
            hash,
            difficulty,
            nonce,
            number: lastBlock.number + 1,
        });
    }
    static adjustDifficulty({ originalBlock, timestamp, }) {
        const { difficulty } = originalBlock;
        if (difficulty < 1)
            return 1;
        return timestamp - originalBlock.timestamp > config_1.MINE_RATE
            ? difficulty - 1
            : difficulty + 1;
    }
    static verifyTxAndTransit({ block, stateDB, }) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            // Basic verification
            if (!block.data.every((transaction) => transaction.isValid()))
                return false;
            // Get all existing addresses
            const addressesInBlock = block.data.map((tx) => tx.from);
            const existedAddresses = yield stateDB.keys().all();
            // If senders' address doesn't exist, return false
            if (!addressesInBlock.every((address) => existedAddresses.includes(address)))
                return false;
            // Start state replay to check if transactions are legit
            let states = {};
            for (const tx of block.data) {
                const txSenderAddress = tx.from;
                // NOTES: update sender's balance
                if (tx.data.type === enum_1.TransactionTypeEnum.STAKE ||
                    tx.data.type === enum_1.TransactionTypeEnum.COIN_PURCHASE) {
                    if (!states[txSenderAddress]) {
                        const senderState = yield stateDB
                            .get(txSenderAddress)
                            .then((data) => JSON.parse(data));
                        // mark the block as invalid if the sender doesn't have enough balance
                        if (senderState.balance < tx.data.amount)
                            return false;
                        states[txSenderAddress] = senderState;
                        states[txSenderAddress].balance -= tx.data.amount;
                    }
                    else {
                        // mark the block as invalid if the sender doesn't have enough balance
                        if (states[txSenderAddress].balance < tx.data.amount)
                            return false;
                        states[txSenderAddress].balance -= tx.data.amount;
                    }
                }
                // NOTES: update receiver's balance
                if (tx.data.type === enum_1.TransactionTypeEnum.COIN_PURCHASE) {
                    if (!existedAddresses.includes(tx.to) && !states[tx.to]) {
                        states[tx.to] = {
                            address: tx.to,
                            balance: 0,
                        };
                    }
                    if (existedAddresses.includes(tx.to) && !states[tx.to]) {
                        states[tx.to] = yield stateDB
                            .get(tx.to)
                            .then((data) => JSON.parse(data));
                    }
                    states[tx.to].balance += tx.data.amount;
                }
                // NOTES: update user transaction history
                if (!enum_1.blockchainTransactions.includes(tx.data.type)) {
                    const txHash = tx.getHash();
                    // NOTES: update sender outgoing transactions
                    if (!states[txSenderAddress]) {
                        const senderState = yield stateDB
                            .get(txSenderAddress)
                            .then((data) => JSON.parse(data));
                        states[txSenderAddress] = senderState;
                    }
                    states[txSenderAddress].outgoingTransactions = [
                        ...((_a = states[txSenderAddress].outgoingTransactions) !== null && _a !== void 0 ? _a : []),
                        txHash,
                    ];
                    // NOTES: update receiver incoming transactions
                    if (!existedAddresses.includes(tx.to) && !states[tx.to]) {
                        states[tx.to] = {
                            address: tx.to,
                            balance: 0,
                            incomingTransactions: [],
                        };
                    }
                    if (existedAddresses.includes(tx.to) && !states[tx.to]) {
                        states[tx.to] = yield stateDB
                            .get(tx.to)
                            .then((data) => JSON.parse(data));
                    }
                    states[tx.to].incomingTransactions = [
                        ...((_b = states[tx.to].incomingTransactions) !== null && _b !== void 0 ? _b : []),
                        txHash,
                    ];
                }
            }
            // Reward
            const rewardTransaction = block.data[0];
            const isMinerAddressExist = existedAddresses.includes(rewardTransaction.to);
            const totalTransaction = block.data.length - 1;
            if (!isMinerAddressExist && !states[rewardTransaction.to]) {
                states[rewardTransaction.to] = {
                    address: rewardTransaction.to,
                    balance: 0,
                };
            }
            if (isMinerAddressExist && !states[rewardTransaction.to]) {
                states[rewardTransaction.to] = yield stateDB
                    .get(rewardTransaction.to)
                    .then((data) => JSON.parse(data));
            }
            states[rewardTransaction.to].balance += totalTransaction;
            for (const account of Object.keys(states)) {
                yield stateDB.put(account, JSON.stringify(states[account]));
            }
            return true;
        });
    }
}
exports.default = Block;
