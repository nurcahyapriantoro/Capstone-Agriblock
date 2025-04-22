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
const ws_1 = __importDefault(require("ws"));
const message_1 = require("./message");
const enum_1 = require("../src/enum");
let reconnectInterval = 1000; // Initial reconnect interval in milliseconds
let maxReconnectInterval = 30000; // Maximum reconnect interval in milliseconds
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
function connect(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const { connectedNodes, currentNode, peer, signature } = params;
        const socket = new ws_1.default(peer.wsAddress, {
            headers: {
                "x-address": currentNode.publicKey,
                "x-signature": signature,
            },
        });
        socket.on("open", () => {
            console.log("sending next message");
            socket.send((0, message_1.produceMessage)(enum_1.MessageTypeEnum.HANDSHAKE, [
                currentNode,
                ...Array.from(connectedNodes.values(), ({ publicKey, wsAddress }) => ({
                    wsAddress,
                    publicKey,
                })),
            ]) // send the connected address of the current node
            );
            // inform other node that a new node is added to the list
            connectedNodes.forEach((node) => node.socket.send(JSON.stringify((0, message_1.produceMessage)(enum_1.MessageTypeEnum.HANDSHAKE, [peer])) // inform other node of the current connected node
            ));
            // add the new address into list of connected peers
            connectedNodes.set(peer.publicKey, Object.assign(Object.assign({}, peer), { socket }));
            console.log(`\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Connected to ${peer.publicKey}.`);
        });
        socket.on("error", (err) => {
            const errorCode = Number(err.message.split(" ").pop());
            // if error code is 403, the connection is rejected
            if (Number.isInteger(errorCode) && errorCode === 403) {
                console.log(`\x1b[31mERROR\x1b[0m [${new Date().toISOString()}] Connection rejected from ${peer.publicKey}.`, err);
                return;
            }
            // reconnect if error
            reconnect(params);
            console.log(`\x1b[31mERROR\x1b[0m [${new Date().toISOString()}] Error when trying to connect to ${peer.publicKey}.`, err);
        });
        socket.on("close", () => {
            // remove addres from connected peers when connection closed
            connectedNodes.delete(peer.publicKey);
            console.log(`\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Disconnected from ${peer.publicKey}.`);
        });
    });
}
const reconnect = (params) => {
    if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        let reconnectIntervalWithBackoff = Math.min(maxReconnectInterval, reconnectInterval * ++reconnectAttempts);
        console.log(`Attempting to reconnect in ${reconnectIntervalWithBackoff} milliseconds...`);
        setTimeout(() => connect(params), reconnectIntervalWithBackoff);
    }
    else {
        console.error("Exceeded maximum number of reconnect attempts.");
        // You might want to notify the user or take other appropriate actions here
    }
};
exports.default = connect;
