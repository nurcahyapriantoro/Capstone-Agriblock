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
const pos_1 = __importDefault(require("../src/consensus/pos"));
const crypto_hash_1 = require("../src/crypto-hash");
jest.mock("level", () => {
    const stakers = [
        {
            publicKey: "bob",
            stake: 50,
        },
        { publicKey: "dyland", stake: 100 },
    ];
    class MockLevelDb {
        constructor() {
            this.put = jest.fn();
        }
        values() {
            return {
                all() {
                    return __awaiter(this, void 0, void 0, function* () {
                        return Promise.resolve(stakers.map((staker) => JSON.stringify(staker)));
                    });
                },
            };
        }
    }
    return {
        Level: MockLevelDb,
    };
});
describe("Proof of Stake", () => {
    afterEach(() => {
        jest.resetModules();
    });
    it("should be able to initialized", () => __awaiter(void 0, void 0, void 0, function* () {
        const consensusProtocol = yield pos_1.default.initialize();
        expect(consensusProtocol.stakers).toEqual({
            bob: 50,
            dyland: 100,
        });
    }));
    it("should be able to update balance", () => __awaiter(void 0, void 0, void 0, function* () {
        const consensusProtocol = yield pos_1.default.initialize();
        consensusProtocol.update("bob", 50);
        expect(consensusProtocol.get("bob")).toEqual(100);
    }));
    it("should be able to select the next forger", () => __awaiter(void 0, void 0, void 0, function* () {
        const consensusProtocol = yield pos_1.default.initialize();
        const nextForger = yield consensusProtocol.forger((0, crypto_hash_1.cryptoHashV2)("winner"));
        expect(nextForger).toBe("dyland");
    }));
});
