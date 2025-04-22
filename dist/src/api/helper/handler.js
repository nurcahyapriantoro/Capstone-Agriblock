"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_errors_1 = __importDefault(require("http-errors"));
const catcher = (fn) => (...args) => {
    const next = args[args.length - 1];
    return Promise.resolve(fn(...args)).catch((error) => {
        next((0, http_errors_1.default)(error));
    });
};
exports.default = catcher;
