/**
 * Configuration for DevSkin APM Agent
 */
export interface AgentConfig {
  /** DevSkin backend URL */
  serverUrl: string;

  /** API key for authentication */
  apiKey: string;

  /** Application ID (required for backend authentication) */
  applicationId: string;

  /** Service name */
  serviceName: string;

  /** Service version */
  serviceVersion?: string;

  /** Environment (production, staging, development) */
  environment?: string;

  /** Enable/disable the agent */
  enabled?: boolean;

  /** Sample rate (0.0 to 1.0) */
  sampleRate?: number;

  /** Enable HTTP instrumentation */
  instrumentHttp?: boolean;

  /** Enable Express instrumentation */
  instrumentExpress?: boolean;

  /** Enable Database instrumentation (MySQL, PostgreSQL, etc.) */
  instrumentDatabase?: boolean;

  /** Batch size for sending data */
  batchSize?: number;

  /** Flush interval in milliseconds */
  flushInterval?: number;

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Span kind
 */
export enum SpanKind {
  SERVER = 'server',
  CLIENT = 'client',
  INTERNAL = 'internal',
  PRODUCER = 'producer',
  CONSUMER = 'consumer',
}

/**
 * Span status
 */
export enum SpanStatus {
  OK = 'ok',
  ERROR = 'error',
}

/**
 * Span data structure
 */
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

/**
 * Span event
 */
export interface SpanEvent {
  timestamp: Date;
  name: string;
  attributes?: Record<string, any>;
}

/**
 * Transaction (root span)
 */
export interface Transaction extends Span {
  transaction_type: string;
  transaction_name: string;
  result?: string;
  sampled: boolean;
}

/**
 * Log entry
 */
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

/**
 * Error data
 */
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
