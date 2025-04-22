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
exports.verifyBlock = void 0;
const block_1 = __importDefault(require("../block"));
const crypto_hash_1 = require("../crypto-hash");
const hexToBinary_1 = require("../../utils/hexToBinary");
function verifyBlock(newBlock, chainInfo, stateDB) {
    return __awaiter(this, void 0, void 0, function* () {
        const checkHash = () => {
            return ((0, crypto_hash_1.cryptoHashV2)(newBlock.timestamp, newBlock.lastHash, newBlock.data, newBlock.nonce, newBlock.difficulty) === newBlock.hash);
        };
        return (
        // Check hash
        checkHash() &&
            chainInfo.latestBlock.hash === newBlock.lastHash &&
            // Check proof of work
            (0, hexToBinary_1.hexToBinary)(newBlock.hash).substring(0, newBlock.difficulty) ===
                "0".repeat(newBlock.difficulty) &&
            // Check transactions
            newBlock.data.every((tx) => tx.isValid()) &&
            // Check timestamp
            newBlock.timestamp > chainInfo.latestBlock.timestamp &&
            newBlock.timestamp < Date.now() &&
            // Check block number
            newBlock.number - 1 === chainInfo.latestBlock.number &&
            // Check transactions and transit state right after
            (yield block_1.default.verifyTxAndTransit({ block: newBlock, stateDB })));
    });
}
exports.verifyBlock = verifyBlock;
