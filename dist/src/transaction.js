"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_hash_1 = require("./crypto-hash");
const keypair_1 = require("../utils/keypair");
class Transaction {
    constructor({ from, to, data, signature, lastTransactionHash, }) {
        this.from = from;
        this.to = to;
        this.data = data;
        this.lastTransactionHash = lastTransactionHash;
        this.signature = signature;
    }
    sign(keyPair) {
        if (keyPair.getPublic("hex") === this.from) {
            this.signature = keyPair.sign(this.getHash()).toDER("hex");
        }
        else {
            throw "Invalid private key!";
        }
    }
    isValid() {
        return (!!this.signature &&
            (0, keypair_1.verifyPublicKey)(this.from, this.getHash(), this.signature));
    }
    getHash() {
        return (0, crypto_hash_1.cryptoHashV2)(this.from, this.to, this.data, this.lastTransactionHash);
    }
}
exports.default = Transaction;
