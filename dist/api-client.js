"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * API client for sending data to DevSkin backend
 */
class ApiClient {
    client;
    apiKey;
    serviceName;
    debug;
    constructor(serverUrl, apiKey, serviceName, debug = false) {
        this.apiKey = apiKey;
        this.serviceName = serviceName;
        this.debug = debug;
        this.client = axios_1.default.create({
            baseURL: serverUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'X-DevSkin-API-Key': apiKey,
            },
        });
    }
    /**
     * Send spans to the backend
     */
    async sendSpans(spans) {
        if (spans.length === 0)
            return;
        try {
            if (this.debug) {
                console.log(`[DevSkin Agent] Sending ${spans.length} spans`);
            }
            await this.client.post('/api/v1/apm/spans', {
                service_name: this.serviceName,
                spans,
            });
        }
        catch (error) {
            console.error('[DevSkin Agent] Failed to send spans:', error.message);
        }
    }
    /**
     * Send transactions to the backend
     */
    async sendTransactions(transactions) {
        if (transactions.length === 0)
            return;
        try {
            if (this.debug) {
                console.log(`[DevSkin Agent] Sending ${transactions.length} transactions`);
            }
            await this.client.post('/api/v1/apm/transactions', {
                service_name: this.serviceName,
                transactions,
            });
        }
        catch (error) {
            console.error('[DevSkin Agent] Failed to send transactions:', error.message);
        }
    }
    /**
     * Send logs to the backend
     */
    async sendLogs(logs) {
        if (logs.length === 0)
            return;
        try {
            if (this.debug) {
                console.log(`[DevSkin Agent] Sending ${logs.length} logs`);
            }
            await this.client.post('/api/v1/logs/batch', {
                service_name: this.serviceName,
                logs,
            });
        }
        catch (error) {
            console.error('[DevSkin Agent] Failed to send logs:', error.message);
        }
    }
    /**
     * Send error data to the backend
     */
    async sendErrors(errors) {
        if (errors.length === 0)
            return;
        try {
            if (this.debug) {
                console.log(`[DevSkin Agent] Sending ${errors.length} errors`);
            }
            await this.client.post('/api/v1/apm/errors', {
                service_name: this.serviceName,
                errors,
            });
        }
        catch (error) {
            console.error('[DevSkin Agent] Failed to send errors:', error.message);
        }
    }
    /**
     * Send service metadata (for service discovery)
     */
    async sendServiceMetadata(metadata) {
        try {
            if (this.debug) {
                console.log('[DevSkin Agent] Sending service metadata');
            }
            await this.client.post('/api/v1/apm/services', {
                service_name: this.serviceName,
                ...metadata,
            });
        }
        catch (error) {
            console.error('[DevSkin Agent] Failed to send service metadata:', error.message);
        }
    }
}
exports.ApiClient = ApiClient;
//# sourceMappingURL=api-client.js.map