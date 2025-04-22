"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const block_1 = __importDefault(require("../block"));
// Miner worker thread's code.
// Listening for messages from the main process.
process.on("message", (message) => {
    var _a;
    if (message.type === "MINE") {
        const newBlock = block_1.default.mineBlock({
            lastBlock: message.data.lastBlock,
            data: message.data.transactions,
        });
        (_a = process.send) === null || _a === void 0 ? void 0 : _a.call(process, { result: newBlock });
    }
});
