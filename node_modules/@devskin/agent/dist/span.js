"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionBuilder = exports.SpanBuilder = void 0;
const types_1 = require("./types");
const id_generator_1 = require("./utils/id-generator");
const context_1 = require("./utils/context");
class SpanBuilder {
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
        context_1.Context.setSpan(this.span);
    }
    setAttribute(key, value) {
        this.span.attributes[key] = value;
        return this;
    }
    setAttributes(attributes) {
        Object.assign(this.span.attributes, attributes);
        return this;
    }
    addEvent(name, attributes) {
        this.span.events.push({
            timestamp: new Date(),
            name,
            attributes,
        });
        return this;
    }
    setStatus(status, message) {
        this.span.status = status;
        if (message) {
            this.span.status_message = message;
        }
        return this;
    }
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
    end() {
        this.span.end_time = new Date();
        this.span.duration_ms = this.span.end_time.getTime() - this.span.start_time.getTime();
        if (this.agent && typeof this.agent.reportSpan === 'function') {
            this.agent.reportSpan(this.span);
        }
    }
    getSpan() {
        return this.span;
    }
}
exports.SpanBuilder = SpanBuilder;
class TransactionBuilder extends SpanBuilder {
    constructor(name, type, serviceName, serviceVersion, environment, sampled = true, agent) {
        super(name, types_1.SpanKind.SERVER, serviceName, serviceVersion, environment, agent);
        const span = this.getSpan();
        this.transaction = {
            ...span,
            transaction_type: type,
            transaction_name: name,
            sampled,
        };
        context_1.Context.setTransaction(this.transaction);
    }
    setResult(result) {
        this.transaction.result = result;
        return this;
    }
    end() {
        this.transaction.end_time = new Date();
        this.transaction.duration_ms =
            this.transaction.end_time.getTime() - this.transaction.start_time.getTime();
        if (this.agent && typeof this.agent.reportTransaction === 'function') {
            this.agent.reportTransaction(this.transaction);
        }
    }
    getTransaction() {
        return this.transaction;
    }
}
exports.TransactionBuilder = TransactionBuilder;
//# sourceMappingURL=span.js.map