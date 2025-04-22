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
exports.getBlock = exports.getBlockTransactions = void 0;
const level_db_client_1 = require("../../helper/level.db.client");
const getBlock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { hash = "", number = "" } = req.query;
    if (!hash && !number) {
        return res.status(400).json({
            message: "Query string must contain either 'hash' or 'number'.",
        });
    }
    yield getBlockData(String(number), String(hash))
        .then((data) => {
        return res.json({
            data: {
                block: data,
            },
        });
    })
        .catch(() => {
        return res.status(404).json({
            message: `Block not found.`,
        });
    });
});
exports.getBlock = getBlock;
const getBlockTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { hash, number } = req.query;
    if (!hash && !number) {
        return res.status(400).json({
            message: "Query string must contain either 'hash' or 'number'.",
        });
    }
    yield getBlockData(String(number), String(hash))
        .then((data) => {
        return res.json({
            data: {
                block: data.data,
            },
        });
    })
        .catch(() => {
        return res.status(404).json({
            message: `Block not found.`,
        });
    });
});
exports.getBlockTransactions = getBlockTransactions;
const getBlockData = (number, hash) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => __awaiter(void 0, void 0, void 0, function* () {
        let blockNumber;
        if (number)
            blockNumber = number;
        else if (hash) {
            try {
                blockNumber = yield level_db_client_1.bhashDB.get(hash);
            }
            catch (err) {
                return reject(err);
            }
        }
        if (blockNumber) {
            try {
                const block = yield level_db_client_1.blockDB
                    .get(blockNumber)
                    .then((data) => JSON.parse(data));
                return resolve(block);
            }
            catch (err) {
                return reject(err);
            }
        }
    }));
});
