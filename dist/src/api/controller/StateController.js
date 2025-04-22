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
exports.getConnectedNode = exports.getStaker = exports.getMiningState = void 0;
const getMiningState = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.status(200).json({
        success: true,
        data: {
            isMining: res.locals.mining,
        },
    });
});
exports.getMiningState = getMiningState;
const getStaker = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.status(200).json({
        success: true,
        data: {
            staker: res.locals.chainInfo.consensus.stakers,
        },
    });
});
exports.getStaker = getStaker;
const getConnectedNode = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json({
        data: {
            connectedNodes: res.locals.getConnectedNode(),
        },
    });
});
exports.getConnectedNode = getConnectedNode;
