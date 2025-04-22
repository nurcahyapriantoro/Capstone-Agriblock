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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const routes_1 = __importDefault(require("./routes"));
const catch404_1 = __importDefault(require("./middleware/catch404"));
const errorHandler_1 = __importDefault(require("./middleware/errorHandler"));
const app = (0, express_1.default)();
const api = (port, client, transactionHandler) => {
    const { chainInfo, publicKey, mining, connectedNodes } = client;
    const localsMiddleware = (_req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        res.locals = {
            chainInfo,
            mining,
            getConnectedNode: () => {
                return [...connectedNodes.values()].map((node) => node.publicKey);
            },
            transactionHandler,
        };
        next();
    });
    process.on("uncaughtException", (err) => console.log(`\x1b[31mERROR\x1b[0m [${new Date().toISOString()}] Uncaught Exception`, err));
    // setup middleware
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    // setup routes
    app.use("/api", localsMiddleware, routes_1.default);
    app.get("/api/node/address", (req, res) => {
        res.json({
            data: { publicKey },
        });
    });
    app.use(catch404_1.default);
    app.use(errorHandler_1.default);
    app.listen(port, () => {
        console.log(`Server up on port ${port}`);
    });
};
exports.default = api;
