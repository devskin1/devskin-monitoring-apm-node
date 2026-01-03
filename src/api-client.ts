import axios, { AxiosInstance } from 'axios';
import { Span, Transaction, LogEntry, ErrorData } from './types';

/**
 * API client for sending data to DevSkin backend
 */
export class ApiClient {
  private client: AxiosInstance;
  private apiKey: string;
  private serviceName: string;
  private applicationId?: string;
  private debug: boolean;

  constructor(serverUrl: string, apiKey: string, serviceName: string, applicationId?: string, debug = false) {
    this.apiKey = apiKey;
    this.serviceName = serviceName;
    this.applicationId = applicationId;
    this.debug = debug;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-DevSkin-API-Key': apiKey,
    };

    if (applicationId) {
      headers['X-DevSkin-Application-Id'] = applicationId;
    }

    this.client = axios.create({
      baseURL: serverUrl,
      timeout: 30000,
      headers,
    });
  }

  /**
   * Send spans to the backend
   */
  async sendSpans(spans: Span[]): Promise<void> {
    if (spans.length === 0) return;

    try {
      if (this.debug) {
        console.log(`[DevSkin Agent] Sending ${spans.length} spans`);
      }

      await this.client.post('/api/v1/apm/spans', {
        service_name: this.serviceName,
        spans,
      });
    } catch (error: any) {
      console.error('[DevSkin Agent] Failed to send spans:', error.message);
    }
  }

  /**
   * Send transactions to the backend
   */
  async sendTransactions(transactions: Transaction[]): Promise<void> {
    if (transactions.length === 0) return;

    try {
      if (this.debug) {
        console.log(`[DevSkin Agent] Sending ${transactions.length} transactions`);
      }

      await this.client.post('/api/v1/apm/transactions', {
        service_name: this.serviceName,
        transactions,
      });
    } catch (error: any) {
      console.error('[DevSkin Agent] Failed to send transactions:', error.message);
    }
  }

  /**
   * Send logs to the backend
   */
  async sendLogs(logs: LogEntry[]): Promise<void> {
    if (logs.length === 0) return;

    try {
      if (this.debug) {
        console.log(`[DevSkin Agent] Sending ${logs.length} logs`);
      }

      await this.client.post('/api/v1/logs/batch', {
        service_name: this.serviceName,
        logs,
      });
    } catch (error: any) {
      console.error('[DevSkin Agent] Failed to send logs:', error.message);
    }
  }

  /**
   * Send error data to the backend
   */
  async sendErrors(errors: ErrorData[]): Promise<void> {
    if (errors.length === 0) return;

    try {
      if (this.debug) {
        console.log(`[DevSkin Agent] Sending ${errors.length} errors`);
      }

      await this.client.post('/api/v1/apm/errors', {
        service_name: this.serviceName,
        errors,
      });
    } catch (error: any) {
      console.error('[DevSkin Agent] Failed to send errors:', error.message);
    }
  }

  /**
   * Send service metadata (for service discovery)
   */
  async sendServiceMetadata(metadata: Record<string, any>): Promise<void> {
    try {
      if (this.debug) {
        console.log('[DevSkin Agent] Sending service metadata');
      }

      await this.client.post('/api/v1/apm/services', {
        service_name: this.serviceName,
        ...metadata,
      });
    } catch (error: any) {
      console.error('[DevSkin Agent] Failed to send service metadata:', error.message);
    }
  }
}
