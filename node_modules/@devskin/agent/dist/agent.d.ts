import { AgentConfig, Span, Transaction, LogEntry, ErrorData } from './types';
export declare class Agent {
    private config;
    private apiClient;
    private spanBuffer;
    private transactionBuffer;
    private logBuffer;
    private errorBuffer;
    private flushTimer?;
    private initialized;
    constructor(config: AgentConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    private initHttpInstrumentation;
    private initDatabaseInstrumentation;
    private sendServiceMetadata;
    reportSpan(span: Span): void;
    reportTransaction(transaction: Transaction): void;
    reportLog(log: LogEntry): void;
    reportError(error: ErrorData): void;
    flush(): Promise<void>;
    getConfig(): AgentConfig;
    shouldSample(): boolean;
}
export declare function init(config: AgentConfig): Agent;
export declare function getAgent(): Agent | null;
export declare function startAgent(): Promise<void>;
export declare function stopAgent(): Promise<void>;
//# sourceMappingURL=agent.d.ts.map