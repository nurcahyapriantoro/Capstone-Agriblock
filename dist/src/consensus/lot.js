"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_hash_1 = require("../crypto-hash");
class Lot {
    constructor(publicKey, iteration, lastBlockHash) {
        this.publicKey = publicKey;
        this.iteration = iteration;
        this.lastBlockHash = lastBlockHash;
    }
    lotHash() {
        return Array.from({ length: this.iteration }).reduce((prev) => (0, crypto_hash_1.cryptoHashV2)(prev), this.publicKey + this.lastBlockHash);
    }
}
exports.default = Lot;
