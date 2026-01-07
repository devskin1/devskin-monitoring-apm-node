"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = void 0;
const axios_1 = __importDefault(require("axios"));
class ApiClient {
    constructor(serverUrl, apiKey, serviceName, applicationId, debug = false) {
        this.apiKey = apiKey;
        this.serviceName = serviceName;
        this.applicationId = applicationId;
        this.debug = debug;
        const headers = {
            'Content-Type': 'application/json',
            'X-DevSkin-API-Key': apiKey,
        };
        if (applicationId) {
            headers['X-DevSkin-Application-Id'] = applicationId;
        }
        this.client = axios_1.default.create({
            baseURL: serverUrl,
            timeout: 30000,
            headers,
        });
    }
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