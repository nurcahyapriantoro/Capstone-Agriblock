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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const block_1 = __importDefault(require("../src/block"));
const crypto_hash_1 = require("../src/crypto-hash");
const hexToBinary_1 = require("../utils/hexToBinary");
const config_1 = require("../src/config");
const transaction_1 = __importDefault(require("../src/transaction"));
const level_1 = require("level");
const keypair_1 = require("../utils/keypair");
jest.mock("level", () => {
    const registeredAddress = [
        "040ff24e54cdfa8b5556fe71ddc0b64847a7ecf7bf8091c9907e336bb891c7a194b9fbd4c35c2d9d305ee80480101b3e2d1e74961cb740126c24dce00b93601b84", // private: 515ef035b82ab36ce9a74f15423c83923d00d37bec4c9fa7998b08def314fdc5
    ];
    class MockLevelDb {
        constructor() {
            this.put = jest.fn();
        }
        keys() {
            return {
                all() {
                    return __awaiter(this, void 0, void 0, function* () {
                        return Promise.resolve(registeredAddress);
                    });
                },
            };
        }
        get() {
            return Promise.resolve(JSON.stringify({
                balance: 10,
            }));
        }
    }
    return {
        Level: MockLevelDb,
    };
});
describe("Block", () => {
    const timestamp = 2000;
    const lastHash = "foo-hash";
    const hash = "bar-hash";
    const data = ["blockchain"];
    let difficulty = 6;
    let nonce = 1;
    const block = new block_1.default({
        timestamp,
        lastHash,
        hash,
        data,
        difficulty,
        nonce,
        number: 1,
    });
    beforeEach(() => {
        jest.resetModules(); // Clears the module registry
        jest.clearAllMocks(); // Clears all mocks
    });
    it("has timestamp, lastHash, hash, and data property", () => {
        expect(block.timestamp).toEqual(timestamp);
        expect(block.data).toEqual(data);
        expect(block.hash).toEqual(hash);
        expect(block.lastHash).toEqual(lastHash);
        expect(block.nonce).toEqual(nonce);
        expect(block.difficulty).toEqual(difficulty);
    });
    describe("genesis()", () => {
        const genesisBlock = block_1.default.genesis();
        it("return Block instance", () => {
            expect(genesisBlock instanceof block_1.default).toBe(true);
        });
        it("return genesis data", () => {
            expect(genesisBlock).toEqual(config_1.GENESIS_DATA);
        });
    });
    describe("mineBlock()", () => {
        console.log = jest.fn();
        const lastBlock = block_1.default.genesis();
        const data = ["new-data", "asd"];
        const minedBlock = block_1.default.mineBlock({ lastBlock, data });
        it("return Block instance", () => {
            expect(minedBlock instanceof block_1.default).toBe(true);
        });
        it("set `lastHash` equals to the last block hash", () => {
            expect(minedBlock.lastHash).toEqual(lastBlock.hash);
        });
        it("set the `data`", () => {
            expect(minedBlock.data).toEqual(data);
        });
        it("set a `timeStamp`", () => {
            expect(minedBlock.timestamp).not.toEqual(undefined);
        });
        it("create SHA-256 hash based on input", () => {
            console.log(minedBlock.hash);
            expect(minedBlock.hash).toEqual((0, crypto_hash_1.cryptoHashV2)(minedBlock.timestamp, lastBlock.hash, data, minedBlock.nonce, minedBlock.difficulty));
        });
        it("set hash matches the difficulty criteria", () => {
            expect((0, hexToBinary_1.hexToBinary)(minedBlock.hash).substring(0, minedBlock.difficulty)).toEqual("0".repeat(minedBlock.difficulty));
        });
        it("adjusts the difficulty", () => {
            const possibleResults = [
                lastBlock.difficulty + 1,
                lastBlock.difficulty - 1,
            ];
            expect(possibleResults.includes(minedBlock.difficulty)).toBe(true);
        });
    });
    describe("adjustDifficulty()", () => {
        it("raise diffuculty for quickly mined block", () => {
            expect(block_1.default.adjustDifficulty({
                originalBlock: block,
                timestamp: block.timestamp + config_1.MINE_RATE - 100,
            })).toEqual(block.difficulty + 1);
        });
        it("lower diffuculty for slowly mined block", () => {
            expect(block_1.default.adjustDifficulty({
                originalBlock: block,
                timestamp: block.timestamp + config_1.MINE_RATE + 100,
            })).toEqual(block.difficulty - 1);
        });
        it("has lower limit 1", () => {
            block.difficulty = -1;
            expect(block_1.default.adjustDifficulty({ originalBlock: block, timestamp: Date.now() })).toEqual(1);
        });
    });
    describe("verifyTxAndTransit()", () => {
        it("should return false if block contain invalid transaction", () => __awaiter(void 0, void 0, void 0, function* () {
            const stateDB = new level_1.Level("dummy-level");
            const transaction = new transaction_1.default({
                from: "me",
                to: "you",
                data: "dummy-data",
            });
            const block = new block_1.default({
                number: 2,
                timestamp: 1,
                nonce: 1,
                lastHash: "dummy-last-hash",
                hash: "dummy-hash",
                difficulty: 1,
                data: [transaction],
            });
            const isValidBlock = yield block_1.default.verifyTxAndTransit({
                block,
                stateDB,
            });
            expect(isValidBlock).toBeFalsy();
        }));
        it("should return false if block contain transaction from unknown address", () => __awaiter(void 0, void 0, void 0, function* () {
            const stateDB = new level_1.Level("dummy-level");
            const keyPair = (0, keypair_1.getKeyPair)("405f7490eb5d49ba4338cc1fc108c87ad5fc1dcc98e211c1a9919c8c19a1b7a1");
            const transaction = new transaction_1.default({
                from: keyPair.getPublic("hex"),
                to: "you",
                data: "dummy-data",
            });
            transaction.sign(keyPair);
            const block = new block_1.default({
                number: 2,
                timestamp: 1,
                nonce: 1,
                lastHash: "dummy-last-hash",
                hash: "dummy-hash",
                difficulty: 1,
                data: [transaction],
            });
            const isValidBlock = yield block_1.default.verifyTxAndTransit({
                block,
                stateDB,
            });
            expect(isValidBlock).toBeFalsy();
        }));
        it("should be able to verify and transit a valid block", () => __awaiter(void 0, void 0, void 0, function* () {
            const stateDB = new level_1.Level("dummy-level");
            const privateKey = "515ef035b82ab36ce9a74f15423c83923d00d37bec4c9fa7998b08def314fdc5";
            const keyPair = (0, keypair_1.getKeyPair)(privateKey);
            const miningTransaction = new transaction_1.default({
                from: keyPair.getPublic("hex"),
                to: keyPair.getPublic("hex"),
                data: {
                    type: "MINING_REWARD",
                },
            });
            miningTransaction.sign(keyPair);
            const coinPurchaseTransaction = new transaction_1.default({
                from: keyPair.getPublic("hex"),
                to: keyPair.getPublic("hex"),
                data: {
                    type: "COIN_PURCHASE",
                    amount: 5,
                },
            });
            coinPurchaseTransaction.sign(keyPair);
            const block = block_1.default.mineBlock({
                lastBlock: config_1.GENESIS_DATA,
                data: [miningTransaction, coinPurchaseTransaction],
            });
            const isValidBlock = yield block_1.default.verifyTxAndTransit({
                block,
                stateDB: stateDB,
            });
            expect(isValidBlock).toBeTruthy();
        }));
    });
});
