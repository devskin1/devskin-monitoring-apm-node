/**
 * DevSkin APM Agent for Node.js
 *
 * @example
 * ```typescript
 * import { init, startAgent } from '@devskin/agent';
 *
 * const agent = init({
 *   serverUrl: 'https://api-monitoring.devskin.com',
 *   apiKey: 'your-api-key',
 *   serviceName: 'my-service',
 *   serviceVersion: '1.0.0',
 *   environment: 'production',
 *   sampleRate: 1.0,
 * });
 *
 * await startAgent();
 * ```
 */

export * from './types';
export * from './agent';
export * from './span';
export * from './api-client';
export * from './utils/context';
export * from './utils/id-generator';
export { expressMiddleware, expressErrorHandler } from './instrumentation/express';

// Re-export commonly used functions
export { init, getAgent, startAgent, stopAgent } from './agent';
export { SpanBuilder, TransactionBuilder } from './span';
export { Context } from './utils/context';
