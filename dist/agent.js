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
exports.Agent = void 0;
exports.init = init;
exports.getAgent = getAgent;
exports.startAgent = startAgent;
exports.stopAgent = stopAgent;
const api_client_1 = require("./api-client");
const id_generator_1 = require("./utils/id-generator");
class Agent {
    constructor(config) {
        this.spanBuffer = [];
        this.transactionBuffer = [];
        this.logBuffer = [];
        this.errorBuffer = [];
        this.initialized = false;
        this.config = {
            enabled: true,
            sampleRate: 1.0,
            instrumentHttp: true,
            instrumentExpress: true,
            batchSize: 100,
            flushInterval: 10000,
            debug: false,
            ...config,
        };
        if (!this.config.enabled) {
            console.log('[DevSkin Agent] Agent is disabled');
            return;
        }
        if (!this.config.serverUrl || !this.config.apiKey || !this.config.serviceName) {
            throw new Error('[DevSkin Agent] serverUrl, apiKey, and serviceName are required');
        }
        this.apiClient = new api_client_1.ApiClient(this.config.serverUrl, this.config.apiKey, this.config.serviceName, this.config.debug);
    }
    async start() {
        if (!this.config.enabled)
            return;
        if (this.initialized)
            return;
        this.initialized = true;
        if (this.config.debug) {
            console.log('[DevSkin Agent] Starting agent for service:', this.config.serviceName);
        }
        this.flushTimer = setInterval(() => {
            this.flush();
        }, this.config.flushInterval);
        await this.sendServiceMetadata();
        if (this.config.instrumentHttp) {
            await this.initHttpInstrumentation();
        }
        if (this.config.debug) {
            console.log('[DevSkin Agent] Agent started successfully');
        }
    }
    async stop() {
        if (!this.config.enabled)
            return;
        if (this.config.debug) {
            console.log('[DevSkin Agent] Stopping agent...');
        }
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        await this.flush();
        this.initialized = false;
        if (this.config.debug) {
            console.log('[DevSkin Agent] Agent stopped');
        }
    }
    async initHttpInstrumentation() {
        try {
            const { instrumentHttp } = await Promise.resolve().then(() => __importStar(require('./instrumentation/http')));
            instrumentHttp(this);
        }
        catch (error) {
            console.error('[DevSkin Agent] Failed to initialize HTTP instrumentation:', error.message);
        }
    }
    async sendServiceMetadata() {
        try {
            await this.apiClient.sendServiceMetadata({
                service_version: this.config.serviceVersion,
                environment: this.config.environment,
                language: 'node.js',
                language_version: process.version,
                metadata: {
                    platform: process.platform,
                    arch: process.arch,
                    node_version: process.version,
                },
            });
        }
        catch (error) {
            if (this.config.debug) {
                console.error('[DevSkin Agent] Failed to send service metadata:', error.message);
            }
        }
    }
    reportSpan(span) {
        if (!this.config.enabled)
            return;
        this.spanBuffer.push(span);
        if (this.spanBuffer.length >= this.config.batchSize) {
            this.flush();
        }
    }
    reportTransaction(transaction) {
        if (!this.config.enabled)
            return;
        this.transactionBuffer.push(transaction);
        if (this.transactionBuffer.length >= this.config.batchSize) {
            this.flush();
        }
    }
    reportLog(log) {
        if (!this.config.enabled)
            return;
        this.logBuffer.push(log);
        if (this.logBuffer.length >= this.config.batchSize) {
            this.flush();
        }
    }
    reportError(error) {
        if (!this.config.enabled)
            return;
        this.errorBuffer.push(error);
        if (this.errorBuffer.length >= this.config.batchSize) {
            this.flush();
        }
    }
    async flush() {
        if (!this.config.enabled)
            return;
        const spans = [...this.spanBuffer];
        const transactions = [...this.transactionBuffer];
        const logs = [...this.logBuffer];
        const errors = [...this.errorBuffer];
        this.spanBuffer = [];
        this.transactionBuffer = [];
        this.logBuffer = [];
        this.errorBuffer = [];
        try {
            await Promise.all([
                this.apiClient.sendSpans(spans),
                this.apiClient.sendTransactions(transactions),
                this.apiClient.sendLogs(logs),
                this.apiClient.sendErrors(errors),
            ]);
        }
        catch (error) {
            if (this.config.debug) {
                console.error('[DevSkin Agent] Failed to flush data:', error.message);
            }
        }
    }
    getConfig() {
        return this.config;
    }
    shouldSample() {
        return (0, id_generator_1.shouldSample)(this.config.sampleRate || 1.0);
    }
}
exports.Agent = Agent;
let globalAgent = null;
function init(config) {
    if (globalAgent) {
        console.warn('[DevSkin Agent] Agent already initialized');
        return globalAgent;
    }
    globalAgent = new Agent(config);
    return globalAgent;
}
function getAgent() {
    return globalAgent;
}
async function startAgent() {
    if (!globalAgent) {
        throw new Error('[DevSkin Agent] Agent not initialized. Call init() first.');
    }
    await globalAgent.start();
}
async function stopAgent() {
    if (globalAgent) {
        await globalAgent.stop();
    }
}
//# sourceMappingURL=agent.js.map