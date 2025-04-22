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
exports.purchaseCoin = exports.createBenih = exports.getTransactionFlow = exports.stakeCoin = exports.transferCoin = exports.getTransactionPool = exports.createTransaction = exports.signTransaction = exports.getTransaction = void 0;
const transaction_1 = __importDefault(require("../../transaction"));
const config_1 = require("../../../src/config");
const level_db_client_1 = require("../../helper/level.db.client");
const keypair_1 = require("../../../utils/keypair");
const enum_1 = require("../../enum");
const getTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { hash } = req.params;
    try {
        const [blockNumber, txIndex] = yield level_db_client_1.txhashDB
            .get(String(hash))
            .then((data) => {
            const [blockNumber, txIndex] = data.split(" ");
            return [Number(blockNumber), Number(txIndex)];
        });
        const block = yield level_db_client_1.blockDB
            .get(String(blockNumber))
            .then((data) => JSON.parse(data));
        const transaction = block.data.find((_tx, index) => index === txIndex);
        res.json({
            metadata: {
                blockNumber: blockNumber,
                transactionIndex: txIndex,
            },
            data: transaction,
        });
    }
    catch (err) {
        res.status(404).json({
            message: "Transaction not found",
        });
    }
});
exports.getTransaction = getTransaction;
const signTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { privateKey, data, from, to, lastTransactionHash } = req.body;
    const keyPair = (0, keypair_1.getKeyPair)(privateKey);
    try {
        const transaction = new transaction_1.default({
            data,
            from,
            to,
            lastTransactionHash,
        });
        transaction.sign(keyPair);
        res.json({
            data: transaction,
        });
    }
    catch (err) {
        res.status(400).json({
            message: err,
        });
    }
});
exports.signTransaction = signTransaction;
const createTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { data, from, to, privateKey, lastTransactionHash, signature } = req.body;
    try {
        const transaction = new transaction_1.default({
            data,
            from,
            to,
            signature,
            lastTransactionHash,
        });
        if (privateKey) {
            const keyPair = (0, keypair_1.getKeyPair)(privateKey);
            transaction.sign(keyPair);
        }
        const isValid = yield res.locals.transactionHandler(transaction);
        if (isValid) {
            return res.status(201).json({
                message: "Transaction created successfully",
                hash: transaction.getHash(),
            });
        }
    }
    catch (err) {
        console.error("Invalid transaction data!");
    }
    res.status(400).json({
        message: "Invalid transaction",
    });
});
exports.createTransaction = createTransaction;
const getTransactionPool = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const chainInfo = res.locals.chainInfo;
    res.json({
        data: {
            transactionPool: chainInfo.transactionPool,
        },
    });
});
exports.getTransactionPool = getTransactionPool;
const transferCoin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { privateKey, address, amount } = req.body;
    const keyPair = (0, keypair_1.getKeyPair)(privateKey);
    try {
        const transaction = new transaction_1.default({
            from: keyPair.getPublic("hex"),
            to: address,
            data: {
                type: enum_1.TransactionTypeEnum.COIN_PURCHASE,
                amount,
            },
        });
        transaction.sign(keyPair);
        const isValid = yield res.locals.transactionHandler(transaction);
        if (isValid) {
            return res.status(201).json({
                message: `${amount} coin transfered to ${address}`,
                hash: transaction.getHash(),
            });
        }
    }
    catch (err) {
        console.error(err);
    }
    res.status(400).json({
        message: "Can't transfer coin, please check your balance!",
    });
});
exports.transferCoin = transferCoin;
const stakeCoin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { privateKey, amount } = req.body;
    const keyPair = (0, keypair_1.getKeyPair)(privateKey);
    const publicKey = keyPair.getPublic("hex");
    try {
        const transaction = new transaction_1.default({
            from: publicKey,
            to: publicKey,
            data: {
                type: enum_1.TransactionTypeEnum.STAKE,
                amount,
            },
        });
        transaction.sign(keyPair);
        const isValid = yield res.locals.transactionHandler(transaction);
        if (isValid) {
            return res.status(201).json({
                message: `${amount} coin staked to ${publicKey}`,
                hash: transaction.getHash(),
            });
        }
    }
    catch (err) {
        console.error(err);
    }
    res.status(400).json({
        message: "Can't stake coin, please check your balance!",
    });
});
exports.stakeCoin = stakeCoin;
const getTransactionFlow = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { hash } = req.params;
    try {
        const transactionList = yield getTransactionByHash(hash);
        res.json({
            data: transactionList,
        });
    }
    catch (err) {
        res.status(404).json({
            message: "Error at generating the transaction flow, please check your data.",
        });
    }
});
exports.getTransactionFlow = getTransactionFlow;
const getTransactionByHash = (hash) => __awaiter(void 0, void 0, void 0, function* () {
    const [blockNumber, txIndex] = yield level_db_client_1.txhashDB
        .get(String(hash))
        .then((data) => {
        const [blockNumber, txIndex] = data.split(" ");
        return [Number(blockNumber), Number(txIndex)];
    });
    const block = yield level_db_client_1.blockDB
        .get(String(blockNumber))
        .then((data) => JSON.parse(data));
    const transaction = block.data[txIndex];
    if (transaction.lastTransactionHash)
        return [
            ...(yield getTransactionByHash(transaction.lastTransactionHash)),
            transaction.data,
        ];
    return [transaction.data];
});
const createBenih = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { GENESIS_PRIVATE_KEY } = config_1.appConfig;
    const { data, address } = req.body;
    const keyPair = (0, keypair_1.getKeyPair)(GENESIS_PRIVATE_KEY);
    try {
        const transaction = new transaction_1.default({
            data,
            from: keyPair.getPublic("hex"),
            to: address,
        });
        transaction.sign(keyPair);
        const isValid = yield res.locals.transactionHandler(transaction);
        if (isValid) {
            return res.status(201).json({
                message: "Transaction created successfully",
                hash: transaction.getHash(),
            });
        }
    }
    catch (err) {
        res.status(400).json({
            message: err,
        });
    }
});
exports.createBenih = createBenih;
const purchaseCoin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { GENESIS_PRIVATE_KEY } = config_1.appConfig;
    const { amount, address } = req.body;
    const keyPair = (0, keypair_1.getKeyPair)(GENESIS_PRIVATE_KEY);
    try {
        const transaction = new transaction_1.default({
            from: keyPair.getPublic("hex"),
            to: address,
            data: {
                type: enum_1.TransactionTypeEnum.COIN_PURCHASE,
                amount,
            },
        });
        transaction.sign(keyPair);
        const isValid = yield res.locals.transactionHandler(transaction);
        if (isValid) {
            return res.status(201).json({
                message: `${amount} coin transfered to ${address}`,
                hash: transaction.getHash(),
            });
        }
    }
    catch (err) {
        res.status(400).json({
            message: err,
        });
    }
});
exports.purchaseCoin = purchaseCoin;
