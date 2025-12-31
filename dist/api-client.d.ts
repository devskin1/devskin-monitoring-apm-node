import { Span, Transaction, LogEntry, ErrorData } from './types';
/**
 * API client for sending data to DevSkin backend
 */
export declare class ApiClient {
    private client;
    private apiKey;
    private serviceName;
    private debug;
    constructor(serverUrl: string, apiKey: string, serviceName: string, debug?: boolean);
    /**
     * Send spans to the backend
     */
    sendSpans(spans: Span[]): Promise<void>;
    /**
     * Send transactions to the backend
     */
    sendTransactions(transactions: Transaction[]): Promise<void>;
    /**
     * Send logs to the backend
     */
    sendLogs(logs: LogEntry[]): Promise<void>;
    /**
     * Send error data to the backend
     */
    sendErrors(errors: ErrorData[]): Promise<void>;
    /**
     * Send service metadata (for service discovery)
     */
    sendServiceMetadata(metadata: Record<string, any>): Promise<void>;
}
//# sourceMappingURL=api-client.d.ts.map