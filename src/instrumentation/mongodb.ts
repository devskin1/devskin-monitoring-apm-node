import { Agent } from '../agent';
import { SpanBuilder } from '../span';
import { SpanKind, SpanStatus } from '../types';

/**
 * Instrument MongoDB driver for database monitoring
 */
export function instrumentMongoDB(agent: Agent): void {
  try {
    let mongodb: any;
    try {
      mongodb = require('mongodb');
    } catch {
      // mongodb not installed
      return;
    }

    const config = agent.getConfig();

    // Patch Collection.prototype methods
    const methods = [
      'find', 'findOne', 'insertOne', 'insertMany',
      'updateOne', 'updateMany', 'deleteOne', 'deleteMany',
      'aggregate', 'countDocuments', 'distinct', 'findOneAndUpdate',
      'findOneAndDelete', 'findOneAndReplace', 'replaceOne', 'bulkWrite'
    ];

    for (const method of methods) {
      const original = mongodb.Collection.prototype[method];
      if (!original) continue;

      mongodb.Collection.prototype[method] = function (...args: any[]) {
        if (!agent.shouldSample()) {
          return original.apply(this, args);
        }

        const collectionName = this.collectionName;
        const dbName = this.s?.db?.databaseName || this.namespace?.db || 'unknown';
        const connectionString = this.s?.db?.s?.client?.s?.url || '';

        // Extract host and port from connection
        let host = 'localhost';
        let port = 27017;
        try {
          const url = new URL(connectionString);
          host = url.hostname || 'localhost';
          port = parseInt(url.port) || 27017;
        } catch {}

        // Create span
        const span = new SpanBuilder(
          `mongodb.${method}`,
          SpanKind.CLIENT,
          config.serviceName!,
          config.serviceVersion,
          config.environment,
          agent
        );

        // Set MongoDB attributes following OpenTelemetry semantic conventions
        span.setAttributes({
          'db.system': 'mongodb',
          'db.name': dbName,
          'db.mongodb.collection': collectionName,
          'db.operation': method,
          'net.peer.name': host,
          'net.peer.port': port,
          'db.connection_string': connectionString.replace(/\/\/[^@]*@/, '//***@'), // Hide credentials
        });

        // Add query details if available
        if (args[0]) {
          if (typeof args[0] === 'object') {
            span.setAttribute('db.statement', JSON.stringify(args[0]).substring(0, 1000));
          }
        }

        span.setAttribute('span.kind', 'client');

        const startTime = Date.now();

        // Execute original method
        const result = original.apply(this, args);

        // Handle promise-based operations
        if (result && typeof result.then === 'function') {
          return result
            .then((res: any) => {
              span.setStatus(SpanStatus.OK);

              // Add result metadata
              if (res) {
                if (res.insertedCount !== undefined) {
                  span.setAttribute('db.rows_affected', res.insertedCount);
                } else if (res.modifiedCount !== undefined) {
                  span.setAttribute('db.rows_affected', res.modifiedCount);
                } else if (res.deletedCount !== undefined) {
                  span.setAttribute('db.rows_affected', res.deletedCount);
                } else if (Array.isArray(res)) {
                  span.setAttribute('db.rows_affected', res.length);
                }
              }

              span.end();
              return res;
            })
            .catch((err: any) => {
              span.setStatus(SpanStatus.ERROR, err.message);
              span.setAttribute('error', true);
              span.setAttribute('error.message', err.message);
              span.setAttribute('error.type', err.name || 'Error');
              span.end();
              throw err;
            });
        }

        // Handle cursor-based operations (find, aggregate)
        if (result && typeof result.toArray === 'function') {
          const originalToArray = result.toArray;
          result.toArray = function () {
            return originalToArray.call(this)
              .then((docs: any[]) => {
                span.setStatus(SpanStatus.OK);
                span.setAttribute('db.rows_affected', docs.length);
                span.end();
                return docs;
              })
              .catch((err: any) => {
                span.setStatus(SpanStatus.ERROR, err.message);
                span.setAttribute('error', true);
                span.setAttribute('error.message', err.message);
                span.end();
                throw err;
              });
          };
        }

        return result;
      };
    }

    if (config.debug) {
      console.log('[DevSkin Agent] MongoDB instrumentation enabled');
    }
  } catch (error: any) {
    if (agent.getConfig().debug) {
      console.error('[DevSkin Agent] Failed to instrument MongoDB:', error.message);
    }
  }
}
