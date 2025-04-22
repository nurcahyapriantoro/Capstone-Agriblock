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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlockchainState = exports.getLastBlock = void 0;
const level_db_client_1 = require("../../helper/level.db.client");
const getLastBlock = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const blockKeys = yield level_db_client_1.blockDB.keys().all();
    const lastStoredBlockKey = Math.max(...blockKeys.map((key) => parseInt(key)));
    try {
        const lastblock = yield level_db_client_1.blockDB
            .get(lastStoredBlockKey.toString())
            .then((data) => JSON.parse(data));
        res.json({
            data: {
                block: lastblock,
            },
        });
    }
    catch (err) {
        res.status(500).json({
            message: "Failed to get last block, please try again in a moment.",
        });
    }
});
exports.getLastBlock = getLastBlock;
const getBlockchainState = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const blockKeys = yield level_db_client_1.blockDB.keys().all();
    const txKeys = yield level_db_client_1.txhashDB.keys().all();
    res.json({
        data: {
            totalBlock: blockKeys.length,
            totalTransaction: txKeys.length,
        },
    });
});
exports.getBlockchainState = getBlockchainState;
