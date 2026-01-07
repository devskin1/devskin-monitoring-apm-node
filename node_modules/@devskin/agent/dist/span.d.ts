import { Span, SpanKind, SpanStatus, Transaction } from './types';
export declare class SpanBuilder {
    private span;
    private agent;
    constructor(name: string, kind: SpanKind, serviceName: string, serviceVersion?: string, environment?: string, agent?: any);
    setAttribute(key: string, value: any): this;
    setAttributes(attributes: Record<string, any>): this;
    addEvent(name: string, attributes?: Record<string, any>): this;
    setStatus(status: SpanStatus, message?: string): this;
    recordError(error: Error): this;
    end(): void;
    getSpan(): Span;
}
export declare class TransactionBuilder extends SpanBuilder {
    private transaction;
    constructor(name: string, type: string, serviceName: string, serviceVersion?: string, environment?: string, sampled?: boolean, agent?: any);
    setResult(result: string): this;
    end(): void;
    getTransaction(): Transaction;
}
//# sourceMappingURL=span.d.ts.map