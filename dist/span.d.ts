import { Span, SpanKind, SpanStatus, Transaction } from './types';
/**
 * Span builder for creating and managing spans
 */
export declare class SpanBuilder {
    private span;
    private agent;
    constructor(name: string, kind: SpanKind, serviceName: string, serviceVersion?: string, environment?: string, agent?: any);
    /**
     * Set an attribute on the span
     */
    setAttribute(key: string, value: any): this;
    /**
     * Set multiple attributes
     */
    setAttributes(attributes: Record<string, any>): this;
    /**
     * Add an event to the span
     */
    addEvent(name: string, attributes?: Record<string, any>): this;
    /**
     * Set the span status
     */
    setStatus(status: SpanStatus, message?: string): this;
    /**
     * Mark the span as having an error
     */
    recordError(error: Error): this;
    /**
     * End the span
     */
    end(): void;
    /**
     * Get the span data
     */
    getSpan(): Span;
}
/**
 * Transaction builder for creating root spans (transactions)
 */
export declare class TransactionBuilder extends SpanBuilder {
    private transaction;
    constructor(name: string, type: string, serviceName: string, serviceVersion?: string, environment?: string, sampled?: boolean, agent?: any);
    /**
     * Set the transaction result
     */
    setResult(result: string): this;
    /**
     * End the transaction
     */
    end(): void;
    /**
     * Get the transaction data
     */
    getTransaction(): Transaction;
}
//# sourceMappingURL=span.d.ts.map