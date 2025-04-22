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
const level_1 = require("level");
const consensus_1 = require("../src/consensus/consensus");
const keypair_1 = require("../utils/keypair");
const transaction_1 = __importDefault(require("../src/transaction"));
const block_1 = __importDefault(require("../src/block"));
const config_1 = require("../src/config");
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
describe("Consensus", () => {
    it("should be able to verify block during consensus", () => __awaiter(void 0, void 0, void 0, function* () {
        console.log = jest.fn();
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
        const normalTransaction = new transaction_1.default({
            from: keyPair.getPublic("hex"),
            to: keyPair.getPublic("hex"),
            data: {
                type: "NORMAL_TRANSACTION",
            },
        });
        normalTransaction.sign(keyPair);
        const block = block_1.default.mineBlock({
            lastBlock: config_1.GENESIS_DATA,
            data: [miningTransaction, normalTransaction],
        });
        const isValidBlock = yield (0, consensus_1.verifyBlock)(block, {
            latestBlock: config_1.GENESIS_DATA,
        }, stateDB);
        expect(isValidBlock).toBeTruthy();
    }));
});
