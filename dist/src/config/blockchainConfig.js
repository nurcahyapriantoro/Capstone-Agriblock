"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INITIAL_SUPPLY = exports.MINT_PUBLIC_ADDRESS = exports.MINT_KEY_PAIR = exports.MINE_REWARD = exports.MINE_RATE = exports.GENESIS_DATA = void 0;
const keypair_1 = require("../../utils/keypair");
const MINT_KEY_PAIR = (0, keypair_1.generateKeyPair)();
exports.MINT_KEY_PAIR = MINT_KEY_PAIR;
const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic("hex");
exports.MINT_PUBLIC_ADDRESS = MINT_PUBLIC_ADDRESS;
const INITIAL_SUPPLY = 1000000;
exports.INITIAL_SUPPLY = INITIAL_SUPPLY;
const MINE_RATE = 6000;
exports.MINE_RATE = MINE_RATE;
const INITIAL_DIFFICULTY = 3;
const MINE_REWARD = 100;
exports.MINE_REWARD = MINE_REWARD;
const GENESIS_DATA = {
    timestamp: 1,
    lastHash: "----",
    hash: "033e0c1d8ace37e628eb8c515a211fa400fa7c17d705acebb2552df401a88dc2",
    difficulty: INITIAL_DIFFICULTY,
    nonce: 12,
    data: [],
    number: 1,
};
exports.GENESIS_DATA = GENESIS_DATA;
