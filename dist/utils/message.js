"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = exports.produceMessage = void 0;
const produceMessage = (type, data) => {
    // Produce a JSON message
    return JSON.stringify({ type, data });
};
exports.produceMessage = produceMessage;
const sendMessage = (message, nodes) => {
    // Broadcast message to all nodes
    nodes.forEach((node) => node.send(message));
};
exports.sendMessage = sendMessage;
