"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Parsing the env file.
dotenv_1.default.config();
// Loading process.env as ENV interface
const getConfig = () => {
    var _a;
    const getPeers = (data) => {
        if (!data)
            return [];
        try {
            const peers = JSON.parse(data);
            return peers;
        }
        catch (err) {
            return [];
        }
    };
    const getAllowedPeers = (data) => {
        if (!data)
            return [];
        return data.split(",");
    };
    return {
        NODE_ENV: (_a = process.env.NODE_ENV) !== null && _a !== void 0 ? _a : "development",
        APP_PORT: process.env.APP_PORT ? Number(process.env.APP_PORT) : 3000,
        API_PORT: process.env.API_PORT ? Number(process.env.API_PORT) : 5000,
        PRIVATE_KEY: process.env.PRIVATE_KEY,
        MY_ADDRESS: process.env.MY_ADDRESS,
        PEERS: getPeers(process.env.PEERS),
        ALLOWED_PEERS: getAllowedPeers(process.env.ALLOWED_PEERS),
        ENABLE_CHAIN_REQUEST: process.env.ENABLE_CHAIN_REQUEST === "true",
        ENABLE_API: process.env.ENABLE_API === "true",
        ENABLE_MINING: process.env.ENABLE_MINING === "true",
        IS_ORDERER_NODE: process.env.IS_ORDERED_NODE === "true",
        GENESIS_PRIVATE_KEY: process.env.GENESIS_PRIVATE_KEY,
        // other settings
        PUBLISH_KEY: process.env.PUBLISH_KEY,
        SUBSCRIBE_KEY: process.env.SUBSCRIBE_KEY,
        SECRET_KEY: process.env.SECRET_KEY,
        USER_ID: process.env.USER_ID,
    };
};
// Throwing an Error if any field was undefined we don't
// want our app to run if it can't connect to DB and ensure
// that these fields are accessible. If all is good return
// it as Config which just removes the undefined from our type
// definition.
const getSanitzedConfig = (config) => {
    for (const [key, value] of Object.entries(config)) {
        if (value === undefined) {
            throw new Error(`Missing key ${key} in config.env`);
        }
    }
    return config;
};
const config = getConfig();
const sanitizedConfig = getSanitzedConfig(config);
exports.default = sanitizedConfig;
