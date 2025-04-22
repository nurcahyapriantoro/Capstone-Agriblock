"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_hash_1 = require("../src/crypto-hash");
const transaction_1 = __importDefault(require("../src/transaction"));
const keypair_1 = require("../utils/keypair");
describe("Transaction", () => {
    it("should be able to sign transaction", () => {
        const keyPair = (0, keypair_1.generateKeyPair)();
        const transaction = new transaction_1.default({
            from: keyPair.getPublic("hex"),
            to: "you",
            data: {
                type: "TRANSFER_COIN",
                amount: 100,
            },
        });
        expect(transaction.signature).toBeUndefined();
        transaction.sign(keyPair);
        expect(transaction.signature).toBeDefined();
    });
    it("should be able to validate transaction", () => {
        const keyPair = (0, keypair_1.generateKeyPair)();
        const transaction = new transaction_1.default({
            from: keyPair.getPublic("hex"),
            to: "you",
            data: {
                type: "TRANSFER_COIN",
                amount: 100,
            },
        });
        transaction.sign(keyPair);
        expect(transaction.isValid()).toBeTruthy();
    });
    it("should be able to get transaction hash", () => {
        const transaction = new transaction_1.default({
            from: "me",
            to: "you",
            data: {
                type: "TRANSFER_COIN",
                amount: 100,
            },
        });
        const txHash = transaction.getHash();
        expect(txHash).toEqual((0, crypto_hash_1.cryptoHashV2)(transaction.from, transaction.to, transaction.data, transaction.lastTransactionHash));
    });
});
