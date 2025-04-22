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
exports.startServer = void 0;
const ws_1 = __importDefault(require("ws"));
const child_process_1 = require("child_process");
const block_1 = __importDefault(require("../block"));
const transaction_1 = __importDefault(require("../transaction"));
const queue_1 = __importDefault(require("../core/queue"));
const pos_1 = __importDefault(require("../consensus/pos"));
const state_1 = __importDefault(require("../core/state"));
const api_1 = __importDefault(require("../api"));
const crypto_hash_1 = __importDefault(require("../crypto-hash"));
const connect_1 = __importDefault(require("../../utils/connect"));
const keypair_1 = require("../../utils/keypair");
const enum_1 = require("../enum");
const message_1 = require("../../utils/message");
const config_1 = require("../config");
const consensus_1 = require("../consensus/consensus");
const txPool_1 = require("../core/txPool");
const level_db_client_1 = require("../helper/level.db.client");
const connectedNodes = new Map();
let worker = (0, child_process_1.fork)(`${__dirname}/../miner/worker.ts`); // Worker thread (for PoW mining).
let mined = false; // This will be used to inform the node that another node has already mined before it.
const chainInfo = {
    syncQueue: new queue_1.default(),
    consensus: new pos_1.default({}),
    latestBlock: block_1.default.genesis(),
    transactionPool: [],
    checkedBlock: {},
    latestSyncBlock: null,
};
function startServer(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const { PRIVATE_KEY, APP_PORT, API_PORT, MY_ADDRESS, PEERS, ENABLE_CHAIN_REQUEST, ENABLE_MINING, ENABLE_API, IS_ORDERER_NODE, GENESIS_PRIVATE_KEY, ALLOWED_PEERS, } = params;
        const keyPair = (0, keypair_1.getKeyPair)(PRIVATE_KEY);
        const genesisKeyPair = (0, keypair_1.getKeyPair)(GENESIS_PRIVATE_KEY);
        chainInfo.consensus = yield pos_1.default.initialize();
        const publicKey = keyPair.getPublic("hex");
        const genesisPublicKey = genesisKeyPair.getPublic("hex");
        const signedPubKey = keyPair.sign((0, crypto_hash_1.default)(publicKey)).toDER("hex");
        let chainRequestEnabled = ENABLE_CHAIN_REQUEST;
        let currentSyncBlock = 1;
        const server = new ws_1.default.Server({
            port: APP_PORT,
            verifyClient: (info, cb) => __awaiter(this, void 0, void 0, function* () {
                const clientAddress = info.req.socket.remoteAddress;
                const peerAddress = info.req.headers["x-address"];
                const signature = info.req.headers["x-signature"];
                // Check if the client's address or key is in the allowed list
                if (peerAddress &&
                    ALLOWED_PEERS.includes(peerAddress) &&
                    (0, keypair_1.verifyPublicKey)(peerAddress, (0, crypto_hash_1.default)(peerAddress), signature)) {
                    cb(true); // Accept the connection
                }
                else {
                    console.log(`\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Connection attempt from unauthorized server at ${clientAddress}.`);
                    cb(false, 403, "Unauthorized server"); // Reject the connection
                }
            }),
        });
        process.on("uncaughtException", (err) => console.log(`\x1b[31mERROR\x1b[0m [${new Date().toISOString()}] Uncaught Exception`, err));
        process.on("exit", (err) => {
            worker.kill();
        });
        console.log(`\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] P2P server listening on PORT`, APP_PORT);
        server.on("connection", (socket, req) => __awaiter(this, void 0, void 0, function* () {
            // Message handler
            socket.on("message", (message) => __awaiter(this, void 0, void 0, function* () {
                const _message = JSON.parse(message.toString());
                switch (_message.type) {
                    case enum_1.MessageTypeEnum.HANDSHAKE:
                        const nodes = _message.data;
                        const newNodes = nodes.filter((node) => !connectedNodes.has(node.publicKey) &&
                            node.publicKey !== publicKey);
                        newNodes.forEach((node) => (0, connect_1.default)({
                            currentNode: {
                                publicKey: publicKey,
                                wsAddress: MY_ADDRESS,
                            },
                            peer: node,
                            connectedNodes,
                            signature: signedPubKey,
                        }));
                        break;
                    case enum_1.MessageTypeEnum.CREATE_TRANSACTION:
                        if (chainRequestEnabled)
                            break; // Unsynced nodes should not be able to proceed.
                        let transaction;
                        try {
                            transaction = new transaction_1.default(_message.data);
                        }
                        catch (err) {
                            // If transaction can not be initialized, it's faulty
                            console.log(`\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Received invalid block.`);
                            break;
                        }
                        const isAddressExist = () => __awaiter(this, void 0, void 0, function* () {
                            const existedAddresses = yield level_db_client_1.stateDB.keys().all();
                            return (existedAddresses.includes(transaction.from) ||
                                chainInfo.transactionPool.findIndex((tx) => tx.to === transaction.from) !== -1);
                        });
                        const isTransactionExist = () => [...chainInfo.transactionPool]
                            .reverse()
                            .findIndex((tx) => tx.getHash() === transaction.getHash()) !== -1;
                        // Skip invalid transaction, empty address, and added transaction
                        if (!transaction.isValid() ||
                            !isAddressExist() ||
                            isTransactionExist()
                        // TODO: implement check last transaction hash existence
                        )
                            break;
                        chainInfo.transactionPool.push(transaction);
                        (0, message_1.sendMessage)(message, Array.from(connectedNodes.values(), (data) => data.socket));
                        console.log(`\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] New transaction received, broadcasted and added to pool.`);
                        break;
                    case enum_1.MessageTypeEnum.REQUEST_BLOCK:
                        const { blockNumber, requestAddress } = _message.data;
                        let requestedBlock;
                        try {
                            const blockData = yield level_db_client_1.blockDB
                                .get(blockNumber.toString())
                                .then((data) => JSON.parse(data));
                            requestedBlock = blockData;
                        }
                        catch (e) {
                            // If block does not exist, break
                            break;
                        }
                        const node = connectedNodes.get(requestAddress);
                        if (node) {
                            node.socket.send((0, message_1.produceMessage)(enum_1.MessageTypeEnum.SEND_BLOCK, requestedBlock)); // Send block
                            console.log(`\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Sent block at position ${blockNumber} to ${requestAddress}.`);
                        }
                        break;
                    case enum_1.MessageTypeEnum.SEND_BLOCK:
                        let block;
                        try {
                            block = new block_1.default(Object.assign(Object.assign({}, _message.data), { data: _message.data.data.map((tx) => new transaction_1.default(tx)) }));
                        }
                        catch (err) {
                            // If block fails to be initialized, it's faulty
                            console.log(`\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Received invalid block.`);
                            return;
                        }
                        if (ENABLE_CHAIN_REQUEST && block.number === currentSyncBlock) {
                            chainInfo.syncQueue.add(block, function (block) {
                                return __awaiter(this, void 0, void 0, function* () {
                                    if ((chainInfo.latestSyncBlock === null &&
                                        config_1.GENESIS_DATA.hash === block.hash) || // For genesis
                                        (yield (0, consensus_1.verifyBlock)(block, chainInfo, level_db_client_1.stateDB)) // For all others
                                    ) {
                                        const blockNumberStr = block.number.toString();
                                        yield level_db_client_1.blockDB.put(blockNumberStr, JSON.stringify(block)); // Add block to chain
                                        yield level_db_client_1.bhashDB.put(block.hash, blockNumberStr); // Assign block number to the matching block hash
                                        // Assign transaction index and block number to transaction hash
                                        for (let txIndex = 0; txIndex < block.data.length; txIndex++) {
                                            const tx = block.data[txIndex];
                                            yield level_db_client_1.txhashDB.put(tx.getHash(), block.number.toString() + " " + txIndex.toString());
                                            // update the node stake
                                            if (tx.data.type === enum_1.TransactionTypeEnum.STAKE)
                                                yield chainInfo.consensus.update(tx.to, tx.data.amount);
                                        }
                                        if (!chainInfo.latestSyncBlock) {
                                            chainInfo.latestSyncBlock = block; // Update latest synced block.
                                            yield (0, state_1.default)(block, level_db_client_1.stateDB); // Force transit state
                                        }
                                        chainInfo.latestBlock = block; // Update latest block cache
                                        console.log(`\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Synced block at position ${block.number}.`);
                                        // Wipe sync queue
                                        chainInfo.syncQueue.wipe();
                                        currentSyncBlock++;
                                        // Continue requesting the next block
                                        for (const node of [...connectedNodes.values()]) {
                                            node.socket.send((0, message_1.produceMessage)(enum_1.MessageTypeEnum.REQUEST_BLOCK, {
                                                blockNumber: currentSyncBlock,
                                                requestAddress: publicKey,
                                            }));
                                        }
                                        return true;
                                    }
                                    else {
                                        console.log(`\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Received invalid block ${JSON.stringify(block.hash)}.`);
                                    }
                                    return false;
                                });
                            });
                        }
                        break;
                    case enum_1.MessageTypeEnum.PUBLISH_BLOCK:
                        let newBlock;
                        try {
                            newBlock = new block_1.default(Object.assign(Object.assign({}, _message.data), { data: _message.data.data.map((tx) => new transaction_1.default(tx)) }));
                        }
                        catch (err) {
                            // If block fails to be initialized, it's faulty
                            return;
                        }
                        if (!chainInfo.checkedBlock[newBlock.hash]) {
                            chainInfo.checkedBlock[newBlock.hash] = true;
                        }
                        else {
                            return;
                        }
                        if (newBlock.lastHash !== chainInfo.latestBlock.lastHash &&
                            (!chainRequestEnabled ||
                                (chainRequestEnabled && currentSyncBlock > 1))
                        // Only proceed if syncing is disabled or enabled but already synced at least the genesis block
                        ) {
                            if (yield (0, consensus_1.verifyBlock)(newBlock, chainInfo, level_db_client_1.stateDB)) {
                                console.log(`\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] New block received.`);
                                // If mining is enabled, we will set mined to true, informing that another node has mined before us.
                                if (ENABLE_MINING) {
                                    mined = true;
                                    worker.kill(); // Stop the worker thread
                                    worker = (0, child_process_1.fork)(`${__dirname}/../miner/worker.ts`); // Renew
                                }
                                const blockNumberStr = newBlock.number.toString();
                                yield level_db_client_1.blockDB.put(blockNumberStr, JSON.stringify(_message.data)); // Add block to chain
                                yield level_db_client_1.bhashDB.put(newBlock.hash, blockNumberStr); // Assign block number to the matching block hash
                                // Apply to all txns of the block: Assign transaction index and block number to transaction hash
                                for (let txIndex = 0; txIndex < newBlock.data.length; txIndex++) {
                                    const tx = newBlock.data[txIndex];
                                    yield level_db_client_1.txhashDB.put(tx.getHash(), blockNumberStr + " " + txIndex.toString());
                                    // update the node stake
                                    if (tx.data.type === enum_1.TransactionTypeEnum.STAKE)
                                        yield chainInfo.consensus.update(tx.to, tx.data.amount);
                                }
                                chainInfo.latestBlock = newBlock; // Update latest block cache
                                // Update the new transaction pool (remove all the transactions that are no longer valid).
                                chainInfo.transactionPool = (0, txPool_1.clearDepreciatedTransaction)(chainInfo.transactionPool, newBlock.data);
                                console.log(`\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Block #${newBlock.number} synced, state transited.`);
                                (0, message_1.sendMessage)(message, Array.from(connectedNodes.values(), (data) => data.socket)); // Broadcast block to other nodes
                                if (ENABLE_CHAIN_REQUEST)
                                    chainRequestEnabled = false;
                            }
                        }
                        break;
                    case enum_1.MessageTypeEnum.START_MINING:
                        if (chainInfo.transactionPool.length > 0)
                            mine(publicKey, genesisKeyPair);
                        break;
                    case enum_1.MessageTypeEnum.REQUEST_POOL:
                        const { poolRequestAddress } = _message.data;
                        const poolRequestNode = connectedNodes.get(poolRequestAddress);
                        if (poolRequestNode) {
                            poolRequestNode.socket.send((0, message_1.produceMessage)(enum_1.MessageTypeEnum.SEND_POOL, chainInfo.transactionPool));
                            console.log(`\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Sent transaction pool to ${poolRequestAddress}.`);
                        }
                        break;
                    case enum_1.MessageTypeEnum.SEND_POOL:
                        const txPool = _message.data;
                        try {
                            const newTxPool = txPool.map((tx) => new transaction_1.default(tx));
                            if (newTxPool.length > 0) {
                                if (!newTxPool.every((tx) => tx.isValid()))
                                    throw "Invalid transaction pool!";
                                chainInfo.transactionPool = newTxPool;
                                console.log(`\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Synced ${newTxPool.length} transactions.`);
                            }
                        }
                        catch (err) {
                            // If tx pool fails to be initialized, it's faulty
                            console.log(`\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Failed to initialize transaction pool: ${err}`);
                        }
                        break;
                }
            }));
        }));
        if (!chainRequestEnabled) {
            const blockchain = yield level_db_client_1.blockDB.keys().all();
            if (blockchain.length === 0) {
                // Add initial coin supply
                yield level_db_client_1.stateDB.put(genesisPublicKey, JSON.stringify({
                    address: genesisPublicKey,
                    balance: config_1.INITIAL_SUPPLY,
                }));
                if (IS_ORDERER_NODE) {
                    // Set orderer as the initial stakers
                    yield chainInfo.consensus.update(publicKey, 1);
                }
                // store genesis block
                yield level_db_client_1.blockDB.put(chainInfo.latestBlock.number.toString(), JSON.stringify(chainInfo.latestBlock));
                // assign block number to the matching block hash
                yield level_db_client_1.bhashDB.put(chainInfo.latestBlock.hash, chainInfo.latestBlock.number.toString());
                yield (0, state_1.default)(chainInfo.latestBlock, level_db_client_1.stateDB);
                console.log(`\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Created Genesis Block with:\n` +
                    `    Block number: ${chainInfo.latestBlock.number.toString()}\n` +
                    `    Timestamp: ${chainInfo.latestBlock.timestamp.toString()}\n` +
                    `    Difficulty: ${chainInfo.latestBlock.difficulty.toString()}\n` +
                    `    Hash: ${chainInfo.latestBlock.hash.toString()}\n`);
            }
            else {
                const lastStoredBlockKey = Math.max(...blockchain.map((key) => parseInt(key)));
                chainInfo.latestBlock = yield level_db_client_1.blockDB
                    .get(lastStoredBlockKey.toString())
                    .then((data) => JSON.parse(data));
            }
        }
        try {
            PEERS.forEach((peer) => (0, connect_1.default)({
                peer,
                currentNode: {
                    publicKey: publicKey,
                    wsAddress: MY_ADDRESS,
                },
                connectedNodes,
                signature: signedPubKey,
            })); // Connect to peers
        }
        catch (e) { }
        // Sync chain
        if (chainRequestEnabled) {
            const blockNumbers = yield level_db_client_1.blockDB.keys().all();
            if (blockNumbers.length !== 0) {
                currentSyncBlock = Math.max(...blockNumbers.map((key) => parseInt(key)));
                chainInfo.latestBlock = yield level_db_client_1.blockDB
                    .get(String(currentSyncBlock))
                    .then((data) => JSON.parse(data));
                currentSyncBlock += 1;
            }
            if (currentSyncBlock === 1) {
                // Add initial coin supply
                yield level_db_client_1.stateDB.put(genesisPublicKey, JSON.stringify({
                    address: genesisPublicKey,
                    balance: config_1.INITIAL_SUPPLY,
                }));
                if (IS_ORDERER_NODE) {
                    // Set orderer as the initial stakers
                    yield chainInfo.consensus.update(publicKey, 1);
                }
            }
            setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                for (const node of [...connectedNodes.values()]) {
                    node.socket.send((0, message_1.produceMessage)(enum_1.MessageTypeEnum.REQUEST_BLOCK, {
                        blockNumber: currentSyncBlock,
                        requestAddress: publicKey,
                    }));
                    node.socket.send((0, message_1.produceMessage)(enum_1.MessageTypeEnum.REQUEST_POOL, {
                        poolRequestAddress: publicKey,
                    }));
                }
                chainRequestEnabled = false;
            }), 5000);
        }
        // orderer scheduler for mining
        if (IS_ORDERER_NODE)
            loopMine(publicKey, MY_ADDRESS, genesisKeyPair);
        if (ENABLE_API)
            (0, api_1.default)(API_PORT, {
                publicKey,
                chainInfo,
                mining: ENABLE_MINING,
                connectedNodes,
            }, transactionHandler);
    });
}
exports.startServer = startServer;
const loopMine = (publicKey, ordererAddress, keyPair) => {
    setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
        if (chainInfo.transactionPool.length > 0) {
            const forgerPublicKey = chainInfo.consensus.forger(chainInfo.latestBlock.hash);
            console.log(forgerPublicKey);
            if (forgerPublicKey) {
                if (forgerPublicKey === publicKey) {
                    mine(publicKey, keyPair);
                }
                else {
                    const forgerNode = connectedNodes.get(forgerPublicKey);
                    if (forgerNode) {
                        forgerNode.socket.send((0, message_1.produceMessage)(enum_1.MessageTypeEnum.START_MINING, {
                            ordererAddress,
                        }));
                    }
                }
            }
        }
    }), 5000);
};
const mine = (publicKey, keyPair) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const startWorker = (lastBlock, transactions) => {
        return new Promise((resolve, reject) => {
            worker.addListener("message", (message) => resolve(message.result));
            worker.send({
                type: "MINE",
                data: {
                    lastBlock,
                    transactions,
                },
            }); // Send a message to the worker thread, asking it to mine.
        });
    };
    // Collect a list of transactions to mine
    const states = {};
    const transactionsToMine = [];
    const existedAddresses = yield level_db_client_1.stateDB.keys().all();
    for (const tx of chainInfo.transactionPool) {
        const txSenderAddress = tx.from;
        // NOTES: update sender's balance
        if (tx.data.type === enum_1.TransactionTypeEnum.STAKE ||
            tx.data.type === enum_1.TransactionTypeEnum.COIN_PURCHASE) {
            if (!states[txSenderAddress]) {
                const senderState = yield level_db_client_1.stateDB
                    .get(txSenderAddress)
                    .then((data) => JSON.parse(data));
                // skip stake if the sender doesn't have enough balance
                if (senderState.balance < tx.data.amount)
                    continue;
                states[txSenderAddress] = senderState;
                states[txSenderAddress].balance -= tx.data.amount;
            }
            else {
                // skip stake if the sender doesn't have enough balance
                if (states[txSenderAddress].balance < tx.data.amount)
                    continue;
                states[txSenderAddress].balance -= tx.data.amount;
            }
        }
        // NOTES: update receiver's balance
        if (tx.data.type === enum_1.TransactionTypeEnum.COIN_PURCHASE) {
            if (!existedAddresses.includes(tx.to) && !states[tx.to]) {
                states[tx.to] = {
                    address: tx.to,
                    balance: 0,
                };
            }
            if (existedAddresses.includes(tx.to) && !states[tx.to]) {
                states[tx.to] = yield level_db_client_1.stateDB
                    .get(tx.to)
                    .then((data) => JSON.parse(data));
            }
            states[tx.to].balance += tx.data.amount;
        }
        // NOTES: update user transaction history
        if (!enum_1.blockchainTransactions.includes(tx.data.type)) {
            const txHash = tx.getHash();
            // NOTES: update sender outgoing transactions
            if (!states[txSenderAddress]) {
                const senderState = yield level_db_client_1.stateDB
                    .get(txSenderAddress)
                    .then((data) => JSON.parse(data));
                states[txSenderAddress] = senderState;
            }
            states[txSenderAddress].outgoingTransactions = [
                ...((_a = states[txSenderAddress].outgoingTransactions) !== null && _a !== void 0 ? _a : []),
                txHash,
            ];
            // NOTES: update receiver incoming transactions
            if (!existedAddresses.includes(tx.to) && !states[tx.to]) {
                states[tx.to] = {
                    address: tx.to,
                    balance: 0,
                    incomingTransactions: [],
                };
            }
            if (existedAddresses.includes(tx.to) && !states[tx.to]) {
                states[tx.to] = yield level_db_client_1.stateDB
                    .get(tx.to)
                    .then((data) => JSON.parse(data));
            }
            states[tx.to].incomingTransactions = [
                ...((_b = states[tx.from].incomingTransactions) !== null && _b !== void 0 ? _b : []),
                txHash,
            ];
        }
        // add to the list of transactions to mine
        transactionsToMine.push(tx);
    }
    const rewardTransaction = new transaction_1.default({
        from: keyPair.getPublic("hex"),
        to: publicKey,
        data: {
            type: enum_1.TransactionTypeEnum.MINING_REWARD,
            minedTransaction: transactionsToMine.map((tx) => tx.getHash()),
        },
    });
    rewardTransaction.sign(keyPair);
    transactionsToMine.unshift(rewardTransaction);
    // Mine the block.
    startWorker(chainInfo.latestBlock, transactionsToMine)
        .then((result) => __awaiter(void 0, void 0, void 0, function* () {
        // If the block is not mined before, we will add it to our chain and broadcast this new block.
        if (!mined) {
            const newBlock = new block_1.default(Object.assign(Object.assign({}, result), { data: result.data.map((tx) => new transaction_1.default(tx)) }));
            yield level_db_client_1.blockDB.put(newBlock.number.toString(), JSON.stringify(newBlock)); // Add block to chain
            yield level_db_client_1.bhashDB.put(newBlock.hash, newBlock.number.toString()); // Assign block number to the matching block hash
            // Assign transaction index and block number to transaction hash
            for (let txIndex = 0; txIndex < newBlock.data.length; txIndex++) {
                const tx = newBlock.data[txIndex];
                const txHash = tx.getHash();
                yield level_db_client_1.txhashDB.put(txHash, newBlock.number.toString() + " " + txIndex.toString());
                // update the node stake
                if (tx.data.type === enum_1.TransactionTypeEnum.STAKE)
                    yield chainInfo.consensus.update(tx.to, tx.data.amount);
            }
            chainInfo.latestBlock = newBlock; // Update latest block cache
            // Reward
            const rewardTransaction = newBlock.data[0];
            const isMinerAddressExist = existedAddresses.includes(rewardTransaction.to);
            const totalTransaction = newBlock.data.length - 1;
            if (!isMinerAddressExist && !states[rewardTransaction.to]) {
                states[rewardTransaction.to] = {
                    address: rewardTransaction.to,
                    balance: 0,
                };
            }
            if (isMinerAddressExist && !states[rewardTransaction.to]) {
                states[rewardTransaction.to] = yield level_db_client_1.stateDB
                    .get(rewardTransaction.to)
                    .then((data) => JSON.parse(data));
            }
            states[rewardTransaction.to].balance += totalTransaction;
            for (const account of Object.keys(states))
                yield level_db_client_1.stateDB.put(account, JSON.stringify(states[account]));
            // Update the new transaction pool (remove all the transactions that are no longer valid).
            chainInfo.transactionPool = (0, txPool_1.clearDepreciatedTransaction)(chainInfo.transactionPool, newBlock.data);
            (0, message_1.sendMessage)((0, message_1.produceMessage)(enum_1.MessageTypeEnum.PUBLISH_BLOCK, newBlock), [...connectedNodes.values()].map((node) => node.socket)); // Broadcast the new block
            console.log(`\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Block #${chainInfo.latestBlock.number} mined and synced, state transited.`);
        }
        else {
            mined = false;
        }
        // Re-create the worker thread
        worker.kill();
        worker = (0, child_process_1.fork)(`${__dirname}/../miner/worker.ts`);
    }))
        .catch((err) => console.log(`\x1b[31mERROR\x1b[0m [${new Date().toISOString()}] Error at mining child process`, err));
});
const transactionHandler = (transaction) => __awaiter(void 0, void 0, void 0, function* () {
    const [isValid, error] = yield (0, txPool_1.validateTransaction)(transaction, chainInfo, level_db_client_1.stateDB);
    if (isValid) {
        chainInfo.transactionPool.push(transaction);
        console.log(`\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Added one transaction to pool.`);
        (0, message_1.sendMessage)((0, message_1.produceMessage)(enum_1.MessageTypeEnum.CREATE_TRANSACTION, transaction), [...connectedNodes.values()].map((node) => node.socket));
        console.log(`\x1b[32mLOG\x1b[0m [${new Date().toISOString()}] Sent one transaction.`);
    }
    else {
        console.log(`\x1b[31mERROR\x1b[0m [${new Date().toISOString()}] Failed to add one transaction to pool: ${error}`);
    }
    return isValid;
});
