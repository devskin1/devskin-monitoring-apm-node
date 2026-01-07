import { Request, Response, NextFunction } from 'express';
import { Agent } from '../agent';
import { TransactionBuilder } from '../span';
import { Context } from '../utils/context';

/**
 * Express middleware for automatic transaction creation
 */
export function expressMiddleware(agent: Agent) {
  const config = agent.getConfig();

  return (req: Request, res: Response, next: NextFunction) => {
    // Check if we should sample this request
    if (!agent.shouldSample()) {
      return next();
    }

    // Extract trace context from headers
    const incomingTraceId = req.headers['x-trace-id'] as string;
    const incomingSpanId = req.headers['x-span-id'] as string;

    // Create transaction
    const transactionName = req.route?.path
      ? `${req.method} ${req.route.path}`
      : `${req.method} ${req.path}`;

    const transaction = new TransactionBuilder(
      transactionName,
      'http.request',
      config.serviceName,
      config.serviceVersion,
      config.environment,
      true,
      agent
    );

    // If there's an incoming trace ID, use it
    if (incomingTraceId) {
      transaction.getTransaction().trace_id = incomingTraceId;
      if (incomingSpanId) {
        transaction.getTransaction().parent_span_id = incomingSpanId;
      }
    }

    transaction.setAttributes({
      'http.method': req.method,
      'http.url': req.originalUrl || req.url,
      'http.target': req.path,
      'http.route': req.route?.path,
      'http.host': req.hostname,
      'http.scheme': req.protocol,
      'http.user_agent': req.get('user-agent'),
      'net.peer.ip': req.ip,
    });

    // Add query params and body (be careful with sensitive data)
    if (Object.keys(req.query).length > 0) {
      transaction.setAttribute('http.query', JSON.stringify(req.query));
    }

    // Store transaction in request object
    (req as any).devskinTransaction = transaction;

    // Run the rest of the request handling in context
    Context.run({ transaction: transaction.getTransaction() }, () => {
      // Wrap res.send, res.json, res.end to capture response
      const originalSend = res.send;
      const originalJson = res.json;
      const originalEnd = res.end;

      const endTransaction = () => {
        transaction.setAttributes({
          'http.status_code': res.statusCode,
        });

        if (res.statusCode >= 400) {
          transaction.setStatus('error' as any, `HTTP ${res.statusCode}`);
        }

        transaction.setResult(res.statusCode < 400 ? 'success' : 'error');
        transaction.end();
      };

      res.send = function (body?: any): Response {
        endTransaction();
        return originalSend.call(this, body);
      };

      res.json = function (body?: any): Response {
        endTransaction();
        return originalJson.call(this, body);
      };

      (res as any).end = function (...args: any[]): Response {
        endTransaction();
        return originalEnd.apply(this, args);
      };

      // Handle errors
      res.on('error', (error: Error) => {
        transaction.recordError(error);
        endTransaction();
      });

      next();
    });
  };
}

/**
 * Express error handler middleware
 */
export function expressErrorHandler(agent: Agent) {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    const transaction = (req as any).devskinTransaction as TransactionBuilder | undefined;

    if (transaction) {
      transaction.recordError(err);
      transaction.setResult('error');
      transaction.end();
    }

    // Report error to agent
    const config = agent.getConfig();
    agent.reportError({
      timestamp: new Date(),
      message: err.message,
      type: err.name,
      stack_trace: err.stack,
      trace_id: Context.getTraceId(),
      span_id: Context.getSpanId(),
      attributes: {
        'http.method': req.method,
        'http.url': req.originalUrl || req.url,
        'http.route': req.route?.path,
      },
      service_name: config.serviceName,
      environment: config.environment,
    });

    next(err);
  };
}
