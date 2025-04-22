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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lot_1 = __importDefault(require("./lot"));
const level_db_client_1 = require("../helper/level.db.client");
class ProofOfStake {
    constructor(data) {
        this.stakers = data;
    }
    static initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            const stakers = yield level_db_client_1.stakeDb
                .values()
                .all()
                .then((data) => data.reduce((prev, cur) => {
                const parsedData = JSON.parse(cur);
                return Object.assign(Object.assign({}, prev), { [parsedData.publicKey]: parsedData.stake });
            }, {}));
            return new ProofOfStake(stakers);
        });
    }
    update(publicKey, stake) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.stakers[publicKey])
                this.stakers[publicKey] += stake;
            else
                this.stakers[publicKey] = stake;
            yield level_db_client_1.stakeDb.put(publicKey, JSON.stringify({ publicKey, stake: this.stakers[publicKey] }));
        });
    }
    get(publicKey) {
        if (this.stakers[publicKey])
            return this.stakers[publicKey];
        else
            return null;
    }
    validatorLots(seed) {
        return Object.keys(this.stakers).flatMap((stakeKey) => Array.from({ length: this.stakers[stakeKey] }, (_, i) => new lot_1.default(stakeKey, i + 1, seed)));
    }
    winnerLot(lots, seed) {
        const referenceHashInt = parseInt(seed, 16);
        const { winnerLot } = lots.reduce((prev, lot) => {
            const lotHashInt = parseInt(lot.lotHash(), 16);
            const offSet = Math.abs(lotHashInt - referenceHashInt);
            if (prev.leastOffSet === null || offSet < prev.leastOffSet) {
                return {
                    winnerLot: lot,
                    leastOffSet: offSet,
                };
            }
            return prev;
        }, {
            winnerLot: null,
            leastOffSet: null,
        });
        return winnerLot;
    }
    forger(lastBlockHash) {
        const lots = this.validatorLots(lastBlockHash);
        const winnerLot = this.winnerLot(lots, lastBlockHash);
        return winnerLot === null || winnerLot === void 0 ? void 0 : winnerLot.publicKey;
    }
}
exports.default = ProofOfStake;
