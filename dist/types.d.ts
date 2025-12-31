export interface AgentConfig {
    serverUrl: string;
    apiKey: string;
    serviceName: string;
    serviceVersion?: string;
    environment?: string;
    enabled?: boolean;
    sampleRate?: number;
    instrumentHttp?: boolean;
    instrumentExpress?: boolean;
    batchSize?: number;
    flushInterval?: number;
    debug?: boolean;
}
export declare enum SpanKind {
    SERVER = "server",
    CLIENT = "client",
    INTERNAL = "internal",
    PRODUCER = "producer",
    CONSUMER = "consumer"
}
export declare enum SpanStatus {
    OK = "ok",
    ERROR = "error"
}
export interface Span {
    span_id: string;
    trace_id: string;
    parent_span_id?: string;
    name: string;
    kind: SpanKind;
    start_time: Date;
    end_time?: Date;
    duration_ms?: number;
    status: SpanStatus;
    status_message?: string;
    attributes: Record<string, any>;
    events: SpanEvent[];
    service_name: string;
    service_version?: string;
    environment?: string;
}
export interface SpanEvent {
    timestamp: Date;
    name: string;
    attributes?: Record<string, any>;
}
export interface Transaction extends Span {
    transaction_type: string;
    transaction_name: string;
    result?: string;
    sampled: boolean;
}
export interface LogEntry {
    timestamp: Date;
    level: string;
    message: string;
    trace_id?: string;
    span_id?: string;
    attributes?: Record<string, any>;
    service_name: string;
    environment?: string;
}
export interface ErrorData {
    timestamp: Date;
    message: string;
    type: string;
    stack_trace?: string;
    trace_id?: string;
    span_id?: string;
    attributes?: Record<string, any>;
    service_name: string;
    environment?: string;
}
//# sourceMappingURL=types.d.ts.map