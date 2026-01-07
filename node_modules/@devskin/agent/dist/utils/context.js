"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = void 0;
const async_hooks_1 = require("async_hooks");
const asyncLocalStorage = new async_hooks_1.AsyncLocalStorage();
class Context {
    static run(context, fn) {
        return asyncLocalStorage.run(context, fn);
    }
    static get() {
        return asyncLocalStorage.getStore();
    }
    static getCurrentTransaction() {
        return asyncLocalStorage.getStore()?.transaction;
    }
    static getCurrentSpan() {
        return asyncLocalStorage.getStore()?.currentSpan;
    }
    static getTraceId() {
        return asyncLocalStorage.getStore()?.traceId;
    }
    static getSpanId() {
        return asyncLocalStorage.getStore()?.spanId;
    }
    static setTransaction(transaction) {
        const store = asyncLocalStorage.getStore();
        if (store) {
            store.transaction = transaction;
            store.traceId = transaction.trace_id;
            store.spanId = transaction.span_id;
        }
    }
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