"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Sync object
const config = {
    verbose: true,
    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },
    coveragePathIgnorePatterns: ["/src/config/", "/src/blockchain.ts"],
};
exports.default = config;
