"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionBuilder = exports.SpanBuilder = void 0;
const types_1 = require("./types");
const id_generator_1 = require("./utils/id-generator");
const context_1 = require("./utils/context");
/**
 * Span builder for creating and managing spans
 */
class SpanBuilder {
    span;
    agent; // Reference to agent for reporting
    constructor(name, kind, serviceName, serviceVersion, environment, agent) {
        const parentSpan = context_1.Context.getCurrentSpan();
        const traceId = context_1.Context.getTraceId() || (0, id_generator_1.generateTraceId)();
        this.span = {
            span_id: (0, id_generator_1.generateSpanId)(),
            trace_id: traceId,
            parent_span_id: parentSpan?.span_id,
            name,
            kind,
            start_time: new Date(),
            status: types_1.SpanStatus.OK,
            attributes: {},
            events: [],
            service_name: serviceName,
            service_version: serviceVersion,
            environment,
        };
        this.agent = agent;
        // Set this span as current in context
        context_1.Context.setSpan(this.span);
    }
    /**
     * Set an attribute on the span
     */
    setAttribute(key, value) {
        this.span.attributes[key] = value;
        return this;
    }
    /**
     * Set multiple attributes
     */
    setAttributes(attributes) {
        Object.assign(this.span.attributes, attributes);
        return this;
    }
    /**
     * Add an event to the span
     */
    addEvent(name, attributes) {
        this.span.events.push({
            timestamp: new Date(),
            name,
            attributes,
        });
        return this;
    }
    /**
     * Set the span status
     */
    setStatus(status, message) {
        this.span.status = status;
        if (message) {
            this.span.status_message = message;
        }
        return this;
    }
    /**
     * Mark the span as having an error
     */
    recordError(error) {
        this.setStatus(types_1.SpanStatus.ERROR, error.message);
        this.setAttributes({
            'error.type': error.name,
            'error.message': error.message,
            'error.stack': error.stack,
        });
        this.addEvent('exception', {
            'exception.type': error.name,
            'exception.message': error.message,
        });
        return this;
    }
    /**
     * End the span
     */
    end() {
        this.span.end_time = new Date();
        this.span.duration_ms = this.span.end_time.getTime() - this.span.start_time.getTime();
        // Report span to agent
        if (this.agent && typeof this.agent.reportSpan === 'function') {
            this.agent.reportSpan(this.span);
        }
    }
    /**
     * Get the span data
     */
    getSpan() {
        return this.span;
    }
}
exports.SpanBuilder = SpanBuilder;
/**
 * Transaction builder for creating root spans (transactions)
 */
class TransactionBuilder extends SpanBuilder {
    transaction;
    constructor(name, type, serviceName, serviceVersion, environment, sampled = true, agent) {
        super(name, types_1.SpanKind.SERVER, serviceName, serviceVersion, environment, agent);
        const span = this.getSpan();
        this.transaction = {
            ...span,
            transaction_type: type,
            transaction_name: name,
            sampled,
        };
        // Set transaction in context
        context_1.Context.setTransaction(this.transaction);
    }
    /**
     * Set the transaction result
     */
    setResult(result) {
        this.transaction.result = result;
        return this;
    }
    /**
     * End the transaction
     */
    end() {
        this.transaction.end_time = new Date();
        this.transaction.duration_ms =
            this.transaction.end_time.getTime() - this.transaction.start_time.getTime();
        // Report transaction to agent
        if (this.agent && typeof this.agent.reportTransaction === 'function') {
            this.agent.reportTransaction(this.transaction);
        }
    }
    /**
     * Get the transaction data
     */
    getTransaction() {
        return this.transaction;
    }
}
exports.TransactionBuilder = TransactionBuilder;
//# sourceMappingURL=span.js.map