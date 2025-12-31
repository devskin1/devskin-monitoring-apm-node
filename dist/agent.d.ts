import { AgentConfig, Span, Transaction, LogEntry, ErrorData } from './types';
/**
 * DevSkin APM Agent
 */
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
    /**
     * Start the agent
     */
    start(): Promise<void>;
    /**
     * Stop the agent
     */
    stop(): Promise<void>;
    /**
     * Initialize HTTP instrumentation
     */
    private initHttpInstrumentation;
    /**
     * Send service metadata
     */
    private sendServiceMetadata;
    /**
     * Report a span
     */
    reportSpan(span: Span): void;
    /**
     * Report a transaction
     */
    reportTransaction(transaction: Transaction): void;
    /**
     * Report a log entry
     */
    reportLog(log: LogEntry): void;
    /**
     * Report an error
     */
    reportError(error: ErrorData): void;
    /**
     * Flush all buffered data
     */
    flush(): Promise<void>;
    /**
     * Get agent configuration
     */
    getConfig(): AgentConfig;
    /**
     * Check if sampling is enabled for this request
     */
    shouldSample(): boolean;
}
/**
 * Initialize the global agent
 */
export declare function init(config: AgentConfig): Agent;
/**
 * Get the global agent instance
 */
export declare function getAgent(): Agent | null;
/**
 * Start the global agent
 */
export declare function startAgent(): Promise<void>;
/**
 * Stop the global agent
 */
export declare function stopAgent(): Promise<void>;
//# sourceMappingURL=agent.d.ts.map