import { Span, Transaction, LogEntry, ErrorData } from './types';
export declare class ApiClient {
    private client;
    private apiKey;
    private serviceName;
    private applicationId?;
    private debug;
    constructor(serverUrl: string, apiKey: string, serviceName: string, applicationId?: string, debug?: boolean);
    sendSpans(spans: Span[]): Promise<void>;
    sendTransactions(transactions: Transaction[]): Promise<void>;
    sendLogs(logs: LogEntry[]): Promise<void>;
    sendErrors(errors: ErrorData[]): Promise<void>;
    sendServiceMetadata(metadata: Record<string, any>): Promise<void>;
}
//# sourceMappingURL=api-client.d.ts.map