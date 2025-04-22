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
exports.clearDepreciatedTransaction = exports.validateTransaction = void 0;
const validateTransaction = (transaction, chainInfo, stateDB) => __awaiter(void 0, void 0, void 0, function* () {
    if (!transaction.isValid())
        return [false, "Transaction is invalid."];
    const isAddressExist = () => __awaiter(void 0, void 0, void 0, function* () {
        const existedAddresses = yield stateDB.keys().all();
        return (existedAddresses.includes(transaction.from) ||
            chainInfo.transactionPool.findIndex((tx) => tx.to === transaction.from) !== -1);
    });
    if (!(yield isAddressExist()))
        return [false, "Sender does not exist."];
    return [true, undefined];
});
exports.validateTransaction = validateTransaction;
const clearDepreciatedTransaction = (prevTransactions, addedTransaction) => {
    const addedTransactionDict = addedTransaction.reduce((acc, tx) => (Object.assign(Object.assign({}, acc), { [tx.signature]: true })), {});
    return prevTransactions.filter((tx) => !addedTransactionDict[tx.signature]);
};
exports.clearDepreciatedTransaction = clearDepreciatedTransaction;
