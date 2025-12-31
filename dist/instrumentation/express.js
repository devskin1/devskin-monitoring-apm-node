"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expressMiddleware = expressMiddleware;
exports.expressErrorHandler = expressErrorHandler;
const span_1 = require("../span");
const context_1 = require("../utils/context");
/**
 * Express middleware for automatic transaction creation
 */
function expressMiddleware(agent) {
    const config = agent.getConfig();
    return (req, res, next) => {
        // Check if we should sample this request
        if (!agent.shouldSample()) {
            return next();
        }
        // Extract trace context from headers
        const incomingTraceId = req.headers['x-trace-id'];
        const incomingSpanId = req.headers['x-span-id'];
        // Create transaction
        const transactionName = req.route?.path
            ? `${req.method} ${req.route.path}`
            : `${req.method} ${req.path}`;
        const transaction = new span_1.TransactionBuilder(transactionName, 'http.request', config.serviceName, config.serviceVersion, config.environment, true, agent);
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
        req.devskinTransaction = transaction;
        // Run the rest of the request handling in context
        context_1.Context.run({ transaction: transaction.getTransaction() }, () => {
            // Wrap res.send, res.json, res.end to capture response
            const originalSend = res.send;
            const originalJson = res.json;
            const originalEnd = res.end;
            const endTransaction = () => {
                transaction.setAttributes({
                    'http.status_code': res.statusCode,
                });
                if (res.statusCode >= 400) {
                    transaction.setStatus('error', `HTTP ${res.statusCode}`);
                }
                transaction.setResult(res.statusCode < 400 ? 'success' : 'error');
                transaction.end();
            };
            res.send = function (body) {
                endTransaction();
                return originalSend.call(this, body);
            };
            res.json = function (body) {
                endTransaction();
                return originalJson.call(this, body);
            };
            res.end = function (...args) {
                endTransaction();
                return originalEnd.apply(this, args);
            };
            // Handle errors
            res.on('error', (error) => {
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
function expressErrorHandler(agent) {
    return (err, req, res, next) => {
        const transaction = req.devskinTransaction;
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
            trace_id: context_1.Context.getTraceId(),
            span_id: context_1.Context.getSpanId(),
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
//# sourceMappingURL=express.js.map