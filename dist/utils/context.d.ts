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
 * Context manager for maintaining trace context across async operations
 */
export declare class Context {
    /**
     * Run a function with a new context
     */
    static run<T>(context: ContextData, fn: () => T): T;
    /**
     * Get the current context
     */
    static get(): ContextData | undefined;
    /**
     * Get the current transaction
     */
    static getCurrentTransaction(): Transaction | undefined;
    /**
     * Get the current span
     */
    static getCurrentSpan(): Span | undefined;
    /**
     * Get the current trace ID
     */
    static getTraceId(): string | undefined;
    /**
     * Get the current span ID
     */
    static getSpanId(): string | undefined;
    /**
     * Set the current transaction
     */
    static setTransaction(transaction: Transaction): void;
    /**
     * Set the current span
     */
    static setSpan(span: Span): void;
}
export {};
//# sourceMappingURL=context.d.ts.map