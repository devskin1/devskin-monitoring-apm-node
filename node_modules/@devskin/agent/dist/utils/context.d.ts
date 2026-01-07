import { Span, Transaction } from '../types';
interface ContextData {
    transaction?: Transaction;
    currentSpan?: Span;
    traceId?: string;
    spanId?: string;
}
export declare class Context {
    static run<T>(context: ContextData, fn: () => T): T;
    static get(): ContextData | undefined;
    static getCurrentTransaction(): Transaction | undefined;
    static getCurrentSpan(): Span | undefined;
    static getTraceId(): string | undefined;
    static getSpanId(): string | undefined;
    static setTransaction(transaction: Transaction): void;
    static setSpan(span: Span): void;
}
export {};
//# sourceMappingURL=context.d.ts.map