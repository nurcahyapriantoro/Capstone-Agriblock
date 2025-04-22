"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_hash_1 = require("../src/crypto-hash");
describe("cryptoHashV2", () => {
    it("generates SHA-256 hashed output", () => {
        expect((0, crypto_hash_1.cryptoHashV2)("foo")).toEqual("2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae");
    });
    it("product the same hash with the same input arguments", () => {
        expect((0, crypto_hash_1.cryptoHashV2)("one", "two", "three")).toEqual((0, crypto_hash_1.cryptoHashV2)("three", "two", "one"));
    });
    it("should produce different hash with different arguments", () => {
        const hash1 = (0, crypto_hash_1.cryptoHashV2)("04afa99edbaf72463f4f2ffe57b2bdedb926a903320d2c3a8d0df0b5e647fda4811333fb0b7ba2f6d776b9e1372fc1db1a2e31d95dcfeb6638d698626d53ce7308", "04fec2a17359838535c1a64989c11031574909db1aa405a0c4ca2ce7346639d7e0b2edaf335fc040c119a8e474bb3bb3a20dfd3b48417c66c29fdcab7ae7fbe9d5", {
            type: "PRODUCT_SHIPMENT",
            name: "Bawang merah",
            amount: 10,
        });
        const hash2 = (0, crypto_hash_1.cryptoHashV2)("04afa99edbaf72463f4f2ffe57b2bdedb926a903320d2c3a8d0df0b5e647fda4811333fb0b7ba2f6d776b9e1372fc1db1a2e31d95dcfeb6638d698626d53ce7308", "04fec2a17359838535c1a64989c11031574909db1aa405a0c4ca2ce7346639d7e0b2edaf335fc040c119a8e474bb3bb3a20dfd3b48417c66c29fdcab7ae7fbe9d5", {
            type: "PRODUCT_SHIPMENT",
            name: "Bawang putih",
            amount: 10,
        });
        expect(hash1).not.toEqual(hash2);
    });
});
