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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = exports.TransactionBuilder = exports.SpanBuilder = exports.stopAgent = exports.startAgent = exports.getAgent = exports.init = exports.instrumentPostgres = exports.instrumentMysql = exports.expressErrorHandler = exports.expressMiddleware = void 0;
__exportStar(require("./types"), exports);
__exportStar(require("./agent"), exports);
__exportStar(require("./span"), exports);
__exportStar(require("./api-client"), exports);
__exportStar(require("./utils/context"), exports);
__exportStar(require("./utils/id-generator"), exports);
var express_1 = require("./instrumentation/express");
Object.defineProperty(exports, "expressMiddleware", { enumerable: true, get: function () { return express_1.expressMiddleware; } });
Object.defineProperty(exports, "expressErrorHandler", { enumerable: true, get: function () { return express_1.expressErrorHandler; } });
var mysql_1 = require("./instrumentation/mysql");
Object.defineProperty(exports, "instrumentMysql", { enumerable: true, get: function () { return mysql_1.instrumentMysql; } });
var postgres_1 = require("./instrumentation/postgres");
Object.defineProperty(exports, "instrumentPostgres", { enumerable: true, get: function () { return postgres_1.instrumentPostgres; } });
var agent_1 = require("./agent");
Object.defineProperty(exports, "init", { enumerable: true, get: function () { return agent_1.init; } });
Object.defineProperty(exports, "getAgent", { enumerable: true, get: function () { return agent_1.getAgent; } });
Object.defineProperty(exports, "startAgent", { enumerable: true, get: function () { return agent_1.startAgent; } });
Object.defineProperty(exports, "stopAgent", { enumerable: true, get: function () { return agent_1.stopAgent; } });
var span_1 = require("./span");
Object.defineProperty(exports, "SpanBuilder", { enumerable: true, get: function () { return span_1.SpanBuilder; } });
Object.defineProperty(exports, "TransactionBuilder", { enumerable: true, get: function () { return span_1.TransactionBuilder; } });
var context_1 = require("./utils/context");
Object.defineProperty(exports, "Context", { enumerable: true, get: function () { return context_1.Context; } });
//# sourceMappingURL=index.js.map