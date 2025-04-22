"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stakeDb = exports.txhashDB = exports.bhashDB = exports.blockDB = exports.stateDB = void 0;
const level_1 = require("level");
let stateDB;
exports.stateDB = stateDB;
let blockDB;
exports.blockDB = blockDB;
let bhashDB;
exports.bhashDB = bhashDB;
let txhashDB;
exports.txhashDB = txhashDB;
let stakeDb;
exports.stakeDb = stakeDb;
const path = process.env.APP_ENV ? `log/${process.env.APP_ENV}` : "log";
if (!global.__stateDb)
    global.__stateDb = new level_1.Level(__dirname + `/../../${path}/stateStore`, {
        valueEncoding: "json",
    });
if (!global.__blockDb)
    global.__blockDb = new level_1.Level(__dirname + `/../../${path}/blockStore`, {
        valueEncoding: "json",
    });
if (!global.__bhashDb)
    global.__bhashDb = new level_1.Level(__dirname + `/../../${path}/bhashStore`, {
        valueEncoding: "json",
    });
if (!global.__txhashDb)
    global.__txhashDb = new level_1.Level(__dirname + `/../../${path}/txhashStore`);
if (!global.__stakeDb)
    global.__stakeDb = new level_1.Level(__dirname + `/../../${path}/stakeStore`);
exports.stateDB = stateDB = global.__stateDb;
exports.blockDB = blockDB = global.__blockDb;
exports.bhashDB = bhashDB = global.__bhashDb;
exports.txhashDB = txhashDB = global.__txhashDb;
exports.stakeDb = stakeDb = global.__stakeDb;
