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
const changeState = (newBlock, stateDB) => __awaiter(void 0, void 0, void 0, function* () {
    // Manually change state
    const existedAddresses = yield stateDB.keys().all();
    for (const tx of newBlock.data) {
        // If the address doesn't already exist in the chain state, we will create a new empty one.
        if (!existedAddresses.includes(tx.to)) {
            yield stateDB.put(tx.to, 
            // TODO: update implementation
            JSON.stringify({
                name: "receiver",
            }));
        }
        // If the address doesn't already exist in the chain state, we will create a new empty one.
        if (!existedAddresses.includes(tx.from)) {
            yield stateDB.put(tx.from, 
            // TODO: update implementation
            JSON.stringify({
                name: "sender",
            }));
        }
    }
    // Reward
    const rewardTransaction = newBlock.data[0];
    const totalTransaction = newBlock.data.length - 1;
    if (!rewardTransaction || rewardTransaction.from === rewardTransaction.to)
        return;
    // If the address doesn't already exist in the chain state, we will create a new empty one.
    if (!existedAddresses.includes(rewardTransaction.to)) {
        yield stateDB.put(rewardTransaction.to, 
        // TODO: update implementation
        JSON.stringify({
            name: "miner",
            balance: totalTransaction,
        }));
    }
    else {
        const minerState = yield stateDB
            .get(rewardTransaction.to)
            .then((data) => JSON.parse(data));
        yield stateDB.put(rewardTransaction.to, JSON.stringify(Object.assign(Object.assign({}, minerState), { balance: minerState.balance + totalTransaction })));
    }
});
exports.default = changeState;
