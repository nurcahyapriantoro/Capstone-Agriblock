"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lot_1 = __importDefault(require("../src/consensus/lot"));
describe("Lot", () => {
    it("should return lot hash", () => {
        const lot1 = new lot_1.default("publicKey", 1, "lastBlockHash");
        const lot10 = new lot_1.default("publicKey", 12, "lastBlockHash");
        expect(lot1).not.toEqual(lot10);
    });
});
