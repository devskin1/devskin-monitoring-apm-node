"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = void 0;
const async_hooks_1 = require("async_hooks");
/**
 * AsyncLocalStorage instance for context propagation
 */
const asyncLocalStorage = new async_hooks_1.AsyncLocalStorage();
/**
 * Context manager for maintaining trace context across async operations
 */
class Context {
    /**
     * Run a function with a new context
     */
    static run(context, fn) {
        return asyncLocalStorage.run(context, fn);
    }
    /**
     * Get the current context
     */
    static get() {
        return asyncLocalStorage.getStore();
    }
    /**
     * Get the current transaction
     */
    static getCurrentTransaction() {
        return asyncLocalStorage.getStore()?.transaction;
    }
    /**
     * Get the current span
     */
    static getCurrentSpan() {
        return asyncLocalStorage.getStore()?.currentSpan;
    }
    /**
     * Get the current trace ID
     */
    static getTraceId() {
        return asyncLocalStorage.getStore()?.traceId;
    }
    /**
     * Get the current span ID
     */
    static getSpanId() {
        return asyncLocalStorage.getStore()?.spanId;
    }
    /**
     * Set the current transaction
     */
    static setTransaction(transaction) {
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
    static setSpan(span) {
        const store = asyncLocalStorage.getStore();
        if (store) {
            store.currentSpan = span;
            store.spanId = span.span_id;
        }
    }
}
exports.Context = Context;
//# sourceMappingURL=context.js.map