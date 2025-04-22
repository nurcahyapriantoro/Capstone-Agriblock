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
exports.getUser = exports.getUserList = exports.generateWallet = void 0;
const keypair_1 = require("../../../utils/keypair");
const level_db_client_1 = require("../../helper/level.db.client");
const generateWallet = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const existingKeys = yield level_db_client_1.stateDB.keys().all();
    let keyPair;
    do {
        keyPair = (0, keypair_1.generateKeyPair)();
    } while (existingKeys.includes(keyPair.getPublic("hex")));
    yield level_db_client_1.stateDB.put(keyPair.getPublic("hex"), JSON.stringify({
        address: keyPair.getPublic("hex"),
        balance: 0,
    }));
    res.status(201).json({
        data: {
            publicKey: keyPair.getPublic("hex"),
            privateKey: keyPair.getPrivate("hex"),
        },
    });
});
exports.generateWallet = generateWallet;
const getUserList = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const users = yield level_db_client_1.stateDB
        .values()
        .all()
        .then((data) => data.map((user) => JSON.parse(user)));
    res.json({
        data: {
            users,
        },
    });
});
exports.getUserList = getUserList;
const getUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { address } = req.params;
    try {
        const user = yield level_db_client_1.stateDB.get(address).then((data) => JSON.parse(data));
        res.json({
            data: {
                user,
            },
        });
    }
    catch (err) {
        res.status(404).json({
            message: "User not found",
        });
    }
});
exports.getUser = getUser;
