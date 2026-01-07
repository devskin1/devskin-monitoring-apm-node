import { Span, SpanKind, SpanStatus, SpanEvent, Transaction } from './types';
import { generateSpanId, generateTraceId } from './utils/id-generator';
import { Context } from './utils/context';

/**
 * Span builder for creating and managing spans
 */
export class SpanBuilder {
  private span: Span;
  private agent: any; // Reference to agent for reporting

  constructor(
    name: string,
    kind: SpanKind,
    serviceName: string,
    serviceVersion?: string,
    environment?: string,
    agent?: any
  ) {
    const parentSpan = Context.getCurrentSpan();
    const traceId = Context.getTraceId() || generateTraceId();

    this.span = {
      span_id: generateSpanId(),
      trace_id: traceId,
      parent_span_id: parentSpan?.span_id,
      name,
      kind,
      start_time: new Date(),
      status: SpanStatus.OK,
      attributes: {},
      events: [],
      service_name: serviceName,
      service_version: serviceVersion,
      environment,
    };

    this.agent = agent;

    // Set this span as current in context
    Context.setSpan(this.span);
  }

  /**
   * Set an attribute on the span
   */
  setAttribute(key: string, value: any): this {
    this.span.attributes[key] = value;
    return this;
  }

  /**
   * Set multiple attributes
   */
  setAttributes(attributes: Record<string, any>): this {
    Object.assign(this.span.attributes, attributes);
    return this;
  }

  /**
   * Add an event to the span
   */
  addEvent(name: string, attributes?: Record<string, any>): this {
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
  setStatus(status: SpanStatus, message?: string): this {
    this.span.status = status;
    if (message) {
      this.span.status_message = message;
    }
    return this;
  }

  /**
   * Mark the span as having an error
   */
  recordError(error: Error): this {
    this.setStatus(SpanStatus.ERROR, error.message);
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
  end(): void {
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
  getSpan(): Span {
    return this.span;
  }
}

/**
 * Transaction builder for creating root spans (transactions)
 */
export class TransactionBuilder extends SpanBuilder {
  private transaction: Transaction;

  constructor(
    name: string,
    type: string,
    serviceName: string,
    serviceVersion?: string,
    environment?: string,
    sampled = true,
    agent?: any
  ) {
    super(name, SpanKind.SERVER, serviceName, serviceVersion, environment, agent);

    const span = this.getSpan();
    this.transaction = {
      ...span,
      transaction_type: type,
      transaction_name: name,
      sampled,
    };

    // Set transaction in context
    Context.setTransaction(this.transaction);
  }

  /**
   * Set the transaction result
   */
  setResult(result: string): this {
    this.transaction.result = result;
    return this;
  }

  /**
   * End the transaction
   */
  end(): void {
    this.transaction.end_time = new Date();
    this.transaction.duration_ms =
      this.transaction.end_time.getTime() - this.transaction.start_time.getTime();

    // Report transaction to agent
    if ((this as any).agent && typeof (this as any).agent.reportTransaction === 'function') {
      (this as any).agent.reportTransaction(this.transaction);
    }
  }

  /**
   * Get the transaction data
   */
  getTransaction(): Transaction {
    return this.transaction;
  }
}
