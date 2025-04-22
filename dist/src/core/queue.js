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
class SyncQueue {
    constructor() {
        this.queue = [];
        this.isSyncing = false;
    }
    add(block, verificationHandler) {
        return __awaiter(this, void 0, void 0, function* () {
            this.queue.push(block);
            if (!this.isSyncing) {
                this.isSyncing = true;
                yield this.sync(verificationHandler);
            }
        });
    }
    sync(verificationHandler) {
        return __awaiter(this, void 0, void 0, function* () {
            while (this.queue.length !== 0) {
                const block = this.queue.shift();
                if (block && (yield verificationHandler(block)))
                    break;
            }
            this.isSyncing = false;
        });
    }
    wipe() {
        this.queue = [];
        this.isSyncing = false;
    }
}
exports.default = SyncQueue;
