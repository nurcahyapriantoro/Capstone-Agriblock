"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appConfig = void 0;
const envConfig_1 = __importDefault(require("./envConfig"));
const envs_1 = require("./envs");
function getConfig() {
    switch (process.env.APP_ENV) {
        // NOTES: Custom app env for testing purposes
        case "node-1":
            return (0, envs_1.createNode1Config)();
        case "node-2":
            return (0, envs_1.createNode2Config)();
        case "node-3":
            return (0, envs_1.createNode3Config)();
        default:
            return envConfig_1.default;
    }
}
exports.appConfig = getConfig();
