import { AsyncLocalStorage } from 'async_hooks';
import { Span, Transaction } from '../types';

/**
 * Context data stored in AsyncLocalStorage
 */
interface ContextData {
  transaction?: Transaction;
  currentSpan?: Span;
  traceId?: string;
  spanId?: string;
}

/**
 * AsyncLocalStorage instance for context propagation
 */
const asyncLocalStorage = new AsyncLocalStorage<ContextData>();

/**
 * Context manager for maintaining trace context across async operations
 */
export class Context {
  /**
   * Run a function with a new context
   */
  static run<T>(context: ContextData, fn: () => T): T {
    return asyncLocalStorage.run(context, fn);
  }

  /**
   * Get the current context
   */
  static get(): ContextData | undefined {
    return asyncLocalStorage.getStore();
  }

  /**
   * Get the current transaction
   */
  static getCurrentTransaction(): Transaction | undefined {
    return asyncLocalStorage.getStore()?.transaction;
  }

  /**
   * Get the current span
   */
  static getCurrentSpan(): Span | undefined {
    return asyncLocalStorage.getStore()?.currentSpan;
  }

  /**
   * Get the current trace ID
   */
  static getTraceId(): string | undefined {
    return asyncLocalStorage.getStore()?.traceId;
  }

  /**
   * Get the current span ID
   */
  static getSpanId(): string | undefined {
    return asyncLocalStorage.getStore()?.spanId;
  }

  /**
   * Set the current transaction
   */
  static setTransaction(transaction: Transaction): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      store.transaction = transaction;
      store.traceId = transaction.trace_id;
      store.spanId = transaction.span_id;
    }
  }

  /**
   * Set the current span
   */
  static setSpan(span: Span): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      store.currentSpan = span;
      store.spanId = span.span_id;
    }
  }
}
