"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchaseCoinSchema = exports.createBenihSchema = exports.coinStakeSchema = exports.coinTransferSchema = exports.transactionSchema = void 0;
const yup = __importStar(require("yup"));
const transactionSchema = yup.object({
    privateKey: yup.string().optional(),
    from: yup.string().required(),
    to: yup.string().required(),
    data: yup.object(),
    lastTransactionHash: yup.string().optional(),
    signature: yup.string().optional(),
});
exports.transactionSchema = transactionSchema;
const singTransactionSchema = yup.object({
    privateKey: yup.string().required(),
    from: yup.string().required(),
    to: yup.string().required(),
    data: yup.object(),
    lastTransactionHash: yup.string().optional(),
});
const coinTransferSchema = yup.object({
    privateKey: yup.string().required(),
    address: yup.string().required(),
    amount: yup.number().required(),
});
exports.coinTransferSchema = coinTransferSchema;
const coinStakeSchema = yup.object({
    privateKey: yup.string().required(),
    amount: yup.number().required(),
});
exports.coinStakeSchema = coinStakeSchema;
const createBenihSchema = yup.object({
    address: yup.string().required(),
    data: yup.object().required(),
});
exports.createBenihSchema = createBenihSchema;
const purchaseCoinSchema = yup.object({
    address: yup.string().required(),
    amount: yup.number().required(),
});
exports.purchaseCoinSchema = purchaseCoinSchema;
