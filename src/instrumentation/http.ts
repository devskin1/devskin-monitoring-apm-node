import * as http from 'http';
import * as https from 'https';
import { Agent } from '../agent';
import { SpanBuilder, TransactionBuilder } from '../span';
import { SpanKind } from '../types';
import { Context } from '../utils/context';

/**
 * Instrument HTTP module
 */
export function instrumentHttp(agent: Agent): void {
  const config = agent.getConfig();

  // Instrument outgoing HTTP requests
  instrumentHttpRequest(http, agent);
  instrumentHttpRequest(https, agent);

  // Instrument incoming HTTP requests (server)
  instrumentHttpServer(http, agent);
  instrumentHttpServer(https, agent);
}

/**
 * Instrument outgoing HTTP requests
 */
function instrumentHttpRequest(module: typeof http | typeof https, agent: Agent): void {
  const originalRequest = module.request;

  (module as any).request = function (
    this: any,
    ...args: any[]
  ) {
    let options = args[0];
    let callback = args[1];

    // Handle overloaded signatures
    if (typeof options === 'string') {
      options = new URL(options);
    }

    // Create a span for the outgoing request
    const config = agent.getConfig();
    const url = typeof args[0] === 'string' ? args[0] : options.href || `${options.protocol}//${options.host || options.hostname}${options.path}`;

    const span = new SpanBuilder(
      `HTTP ${options.method || 'GET'}`,
      SpanKind.CLIENT,
      config.serviceName,
      config.serviceVersion,
      config.environment,
      agent
    );

    span.setAttributes({
      'http.method': options.method || 'GET',
      'http.url': url,
      'http.target': options.path || '/',
      'net.peer.name': options.hostname || options.host,
      'net.peer.port': options.port,
    });

    // Add trace context to outgoing request headers
    const traceId = Context.getTraceId();
    const spanId = span.getSpan().span_id;

    if (!options.headers) {
      options.headers = {};
    }
    options.headers['x-trace-id'] = traceId;
    options.headers['x-span-id'] = spanId;

    // Wrap callback
    const wrappedCallback = (res: http.IncomingMessage) => {
      span.setAttributes({
        'http.status_code': res.statusCode,
        'http.response.size': res.headers['content-length'],
      });

      if (res.statusCode && res.statusCode >= 400) {
        span.setStatus('error' as any, `HTTP ${res.statusCode}`);
      }

      res.on('end', () => {
        span.end();
      });

      if (callback) {
        callback(res);
      }
    };

    const req = originalRequest.call(this, options, wrappedCallback);

    req.on('error', (error: Error) => {
      span.recordError(error);
      span.end();
    });

    return req;
  };
}

/**
 * Instrument incoming HTTP requests (server)
 */
function instrumentHttpServer(module: typeof http | typeof https, agent: Agent): void {
  const originalCreateServer = module.createServer;

  (module as any).createServer = function (
    this: any,
    ...args: any[]
  ): http.Server | https.Server {
    const server = originalCreateServer.call(this, ...args) as http.Server | https.Server;
    const config = agent.getConfig();

    // Wrap the request listener
    server.on('request', (req: http.IncomingMessage, res: http.ServerResponse) => {
      // Check if we should sample this request
      if (!agent.shouldSample()) {
        return;
      }

      // Extract trace context from headers
      const incomingTraceId = req.headers['x-trace-id'] as string;
      const incomingSpanId = req.headers['x-span-id'] as string;

      const transaction = new TransactionBuilder(
        `${req.method} ${req.url}`,
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
        'http.url': req.url,
        'http.target': req.url,
        'http.host': req.headers.host,
        'http.scheme': (req as any).protocol || 'http',
        'http.user_agent': req.headers['user-agent'],
        'net.peer.ip': req.socket.remoteAddress,
        'net.peer.port': req.socket.remotePort,
      });

      // Run the rest of the request handling in context
      Context.run({ transaction: transaction.getTransaction() }, () => {
        const originalEnd = res.end;

        (res as any).end = function (this: http.ServerResponse, ...endArgs: any[]) {
          transaction.setAttributes({
            'http.status_code': res.statusCode,
            'http.response.size': res.getHeader('content-length'),
          });

          if (res.statusCode >= 400) {
            transaction.setStatus('error' as any, `HTTP ${res.statusCode}`);
          }

          transaction.setResult(res.statusCode < 400 ? 'success' : 'error');
          transaction.end();

          return originalEnd.call(this, ...endArgs);
        };
      });
    });

    return server;
  };
}
