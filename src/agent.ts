import { AgentConfig, Span, Transaction, LogEntry, ErrorData } from './types';
import { ApiClient } from './api-client';
import { shouldSample } from './utils/id-generator';
import { Context } from './utils/context';

/**
 * DevSkin APM Agent
 */
export class Agent {
  private config: AgentConfig;
  private apiClient: ApiClient;
  private spanBuffer: Span[] = [];
  private transactionBuffer: Transaction[] = [];
  private logBuffer: LogEntry[] = [];
  private errorBuffer: ErrorData[] = [];
  private flushTimer?: NodeJS.Timeout;
  private initialized = false;

  constructor(config: AgentConfig) {
    this.config = {
      enabled: true,
      sampleRate: 1.0,
      instrumentHttp: true,
      instrumentExpress: true,
      batchSize: 100,
      flushInterval: 10000, // 10 seconds
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

    this.apiClient = new ApiClient(
      this.config.serverUrl,
      this.config.apiKey,
      this.config.serviceName,
      this.config.debug
    );
  }

  /**
   * Start the agent
   */
  async start(): Promise<void> {
    if (!this.config.enabled) return;
    if (this.initialized) return;

    this.initialized = true;

    if (this.config.debug) {
      console.log('[DevSkin Agent] Starting agent for service:', this.config.serviceName);
    }

    // Start flush timer
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);

    // Send service metadata for discovery
    await this.sendServiceMetadata();

    // Initialize instrumentation
    if (this.config.instrumentHttp) {
      await this.initHttpInstrumentation();
    }

    if (this.config.debug) {
      console.log('[DevSkin Agent] Agent started successfully');
    }
  }

  /**
   * Stop the agent
   */
  async stop(): Promise<void> {
    if (!this.config.enabled) return;

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

  /**
   * Initialize HTTP instrumentation
   */
  private async initHttpInstrumentation(): Promise<void> {
    try {
      const { instrumentHttp } = await import('./instrumentation/http');
      instrumentHttp(this);
    } catch (error: any) {
      console.error('[DevSkin Agent] Failed to initialize HTTP instrumentation:', error.message);
    }
  }

  /**
   * Send service metadata
   */
  private async sendServiceMetadata(): Promise<void> {
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
    } catch (error: any) {
      if (this.config.debug) {
        console.error('[DevSkin Agent] Failed to send service metadata:', error.message);
      }
    }
  }

  /**
   * Report a span
   */
  reportSpan(span: Span): void {
    if (!this.config.enabled) return;

    this.spanBuffer.push(span);

    if (this.spanBuffer.length >= this.config.batchSize!) {
      this.flush();
    }
  }

  /**
   * Report a transaction
   */
  reportTransaction(transaction: Transaction): void {
    if (!this.config.enabled) return;

    this.transactionBuffer.push(transaction);

    if (this.transactionBuffer.length >= this.config.batchSize!) {
      this.flush();
    }
  }

  /**
   * Report a log entry
   */
  reportLog(log: LogEntry): void {
    if (!this.config.enabled) return;

    this.logBuffer.push(log);

    if (this.logBuffer.length >= this.config.batchSize!) {
      this.flush();
    }
  }

  /**
   * Report an error
   */
  reportError(error: ErrorData): void {
    if (!this.config.enabled) return;

    this.errorBuffer.push(error);

    if (this.errorBuffer.length >= this.config.batchSize!) {
      this.flush();
    }
  }

  /**
   * Flush all buffered data
   */
  async flush(): Promise<void> {
    if (!this.config.enabled) return;

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
    } catch (error: any) {
      if (this.config.debug) {
        console.error('[DevSkin Agent] Failed to flush data:', error.message);
      }
    }
  }

  /**
   * Get agent configuration
   */
  getConfig(): AgentConfig {
    return this.config;
  }

  /**
   * Check if sampling is enabled for this request
   */
  shouldSample(): boolean {
    return shouldSample(this.config.sampleRate || 1.0);
  }
}

/**
 * Global agent instance
 */
let globalAgent: Agent | null = null;

/**
 * Initialize the global agent
 */
export function init(config: AgentConfig): Agent {
  if (globalAgent) {
    console.warn('[DevSkin Agent] Agent already initialized');
    return globalAgent;
  }

  globalAgent = new Agent(config);
  return globalAgent;
}

/**
 * Get the global agent instance
 */
export function getAgent(): Agent | null {
  return globalAgent;
}

/**
 * Start the global agent
 */
export async function startAgent(): Promise<void> {
  if (!globalAgent) {
    throw new Error('[DevSkin Agent] Agent not initialized. Call init() first.');
  }
  await globalAgent.start();
}

/**
 * Stop the global agent
 */
export async function stopAgent(): Promise<void> {
  if (globalAgent) {
    await globalAgent.stop();
  }
}
