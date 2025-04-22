"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const block_1 = __importDefault(require("./block"));
const transaction_1 = __importDefault(require("./transaction"));
const crypto_hash_1 = require("./crypto-hash");
const config_1 = require("./config");
/**
 * @deprecated
 */
class Blockchain {
    constructor() {
        this.chain = [block_1.default.genesis()];
        this.transactions = [];
    }
    static isValidChain(chain) {
        if (JSON.stringify(chain[0]) !== JSON.stringify(block_1.default.genesis()))
            return false;
        for (let i = 1; i < chain.length; i++) {
            const { timestamp, data, hash, lastHash, difficulty, nonce } = chain[i];
            const { hash: actualLastHash, difficulty: lastDifficulty } = chain[i - 1];
            if (lastHash !== actualLastHash)
                return false;
            const validatedHash = (0, crypto_hash_1.cryptoHashV2)(timestamp, lastHash, data, nonce, difficulty);
            if (hash !== validatedHash ||
                Math.abs(lastDifficulty - difficulty) > 1 //prevent difficulty jump
            )
                return false;
        }
        return true;
    }
    getLastBlock() {
        return this.chain[this.chain.length - 1];
    }
    addBlock({ data }) {
        const newBlock = block_1.default.mineBlock({
            data,
            lastBlock: this.getLastBlock(),
        });
        this.chain.push(newBlock);
    }
    replaceChain(newChain) {
        if (newChain.length <= this.chain.length) {
            console.error("The incoming chain must be longer!");
            return;
        }
        if (!Blockchain.isValidChain(newChain)) {
            console.error("The incoming chain must be valid!");
            return;
        }
        this.chain = newChain;
    }
    mineTransaction(rewardAddress) {
        const rewardTransaction = new transaction_1.default({
            from: config_1.MINT_PUBLIC_ADDRESS,
            to: rewardAddress,
            data: [],
        });
        rewardTransaction.sign(config_1.MINT_KEY_PAIR);
        this.addBlock({
            data: [rewardTransaction, ...this.transactions],
        });
        this.transactions = [];
    }
    addTransaction(transaction) {
        if (transaction.isValid())
            this.transactions.push(transaction);
    }
}
exports.default = Blockchain;
