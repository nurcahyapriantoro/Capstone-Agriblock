"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cryptoHashV2 = void 0;
const crypto_1 = require("crypto");
const cryptoHashV2 = (...args) => {
    const hash = (0, crypto_1.createHash)("sha256");
    hash.update(args
        .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg))
        .sort()
        .join(" "));
    return hash.digest("hex");
};
exports.cryptoHashV2 = cryptoHashV2;
exports.default = exports.cryptoHashV2;
