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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.instrumentHttp = instrumentHttp;
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const span_1 = require("../span");
const types_1 = require("../types");
const context_1 = require("../utils/context");
function instrumentHttp(agent) {
    const config = agent.getConfig();
    instrumentHttpRequest(http, agent);
    instrumentHttpRequest(https, agent);
    instrumentHttpServer(http, agent);
    instrumentHttpServer(https, agent);
}
function instrumentHttpRequest(module, agent) {
    const originalRequest = module.request;
    module.request = function (...args) {
        let options = args[0];
        let callback = args[1];
        if (typeof options === 'string') {
            options = new URL(options);
        }
        const config = agent.getConfig();
        const url = typeof args[0] === 'string' ? args[0] : options.href || `${options.protocol}//${options.host || options.hostname}${options.path}`;
        const span = new span_1.SpanBuilder(`HTTP ${options.method || 'GET'}`, types_1.SpanKind.CLIENT, config.serviceName, config.serviceVersion, config.environment, agent);
        span.setAttributes({
            'http.method': options.method || 'GET',
            'http.url': url,
            'http.target': options.path || '/',
            'net.peer.name': options.hostname || options.host,
            'net.peer.port': options.port,
        });
        const traceId = context_1.Context.getTraceId();
        const spanId = span.getSpan().span_id;
        if (!options.headers) {
            options.headers = {};
        }
        options.headers['x-trace-id'] = traceId;
        options.headers['x-span-id'] = spanId;
        const wrappedCallback = (res) => {
            span.setAttributes({
                'http.status_code': res.statusCode,
                'http.response.size': res.headers['content-length'],
            });
            if (res.statusCode && res.statusCode >= 400) {
                span.setStatus('error', `HTTP ${res.statusCode}`);
            }
            res.on('end', () => {
                span.end();
            });
            if (callback) {
                callback(res);
            }
        };
        const req = originalRequest.call(this, options, wrappedCallback);
        req.on('error', (error) => {
            span.recordError(error);
            span.end();
        });
        return req;
    };
}
function instrumentHttpServer(module, agent) {
    const originalCreateServer = module.createServer;
    module.createServer = function (...args) {
        const server = originalCreateServer.call(this, ...args);
        const config = agent.getConfig();
        server.on('request', (req, res) => {
            if (!agent.shouldSample()) {
                return;
            }
            const incomingTraceId = req.headers['x-trace-id'];
            const incomingSpanId = req.headers['x-span-id'];
            const transaction = new span_1.TransactionBuilder(`${req.method} ${req.url}`, 'http.request', config.serviceName, config.serviceVersion, config.environment, true, agent);
            if (incomingTraceId) {
                transaction.getTransaction().trace_id = incomingTraceId;
                if (incomingSpanId) {
                    transaction.getTransaction().parent_span_id = incomingSpanId;
                }
            }
            transaction.setAttributes({
                'http.method': req.method,
                'http.url': req.url,
                'http.target': req.url,
                'http.host': req.headers.host,
                'http.scheme': req.protocol || 'http',
                'http.user_agent': req.headers['user-agent'],
                'net.peer.ip': req.socket.remoteAddress,
                'net.peer.port': req.socket.remotePort,
            });
            context_1.Context.run({ transaction: transaction.getTransaction() }, () => {
                const originalEnd = res.end;
                res.end = function (...endArgs) {
                    transaction.setAttributes({
                        'http.status_code': res.statusCode,
                        'http.response.size': res.getHeader('content-length'),
                    });
                    if (res.statusCode >= 400) {
                        transaction.setStatus('error', `HTTP ${res.statusCode}`);
                    }
                    transaction.setResult(res.statusCode < 400 ? 'success' : 'error');
                    transaction.end();
                    return originalEnd.call(this, ...endArgs);
                };
            });
        });
        return server;
    };
}
//# sourceMappingURL=http.js.map