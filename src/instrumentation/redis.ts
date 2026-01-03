import { Agent } from '../agent';
import { SpanBuilder } from '../span';
import { SpanKind, SpanStatus } from '../types';

/**
 * Instrument Redis (ioredis and redis) for database monitoring
 */
export function instrumentRedis(agent: Agent): void {
  try {
    // Try ioredis first (more popular)
    let ioredis: any;
    try {
      ioredis = require('ioredis');
      instrumentIORedis(agent, ioredis);
    } catch {}

    // Try redis (node-redis)
    let redis: any;
    try {
      redis = require('redis');
      instrumentNodeRedis(agent, redis);
    } catch {}
  } catch (error: any) {
    if (agent.getConfig().debug) {
      console.error('[DevSkin Agent] Failed to instrument Redis:', error.message);
    }
  }
}

/**
 * Instrument ioredis
 */
function instrumentIORedis(agent: Agent, ioredis: any): void {
  const config = agent.getConfig();
  const originalSendCommand = ioredis.prototype.sendCommand;

  ioredis.prototype.sendCommand = function (command: any, ...args: any[]) {
    if (!agent.shouldSample()) {
      return originalSendCommand.call(this, command, ...args);
    }

    const commandName = command?.name || 'unknown';
    const commandArgs = command?.args || [];

    // Extract connection info
    const host = this.options?.host || 'localhost';
    const port = this.options?.port || 6379;
    const db = this.options?.db || 0;

    // Create span
    const span = new SpanBuilder(
      `redis.${commandName}`,
      SpanKind.CLIENT,
      config.serviceName!,
      config.serviceVersion,
      config.environment,
      agent
    );

    span.setAttributes({
      'db.system': 'redis',
      'db.name': `${db}`,
      'db.operation': commandName.toUpperCase(),
      'db.statement': `${commandName} ${commandArgs.slice(0, 3).join(' ')}`.substring(0, 500),
      'net.peer.name': host,
      'net.peer.port': port,
      'db.connection_string': `redis://${host}:${port}/${db}`,
    });

    span.setAttribute('span.kind', 'client');

    // Execute command
    const result = originalSendCommand.call(this, command, ...args);

    if (result && typeof result.then === 'function') {
      return result
        .then((res: any) => {
          span.setStatus(SpanStatus.OK);
          span.end();
          return res;
        })
        .catch((err: any) => {
          span.setStatus(SpanStatus.ERROR, err.message);
          span.setAttribute('error', true);
          span.setAttribute('error.message', err.message);
          span.end();
          throw err;
        });
    }

    span.end();
    return result;
  };

  if (config.debug) {
    console.log('[DevSkin Agent] IORedis instrumentation enabled');
  }
}

/**
 * Instrument node-redis
 */
function instrumentNodeRedis(agent: Agent, redis: any): void {
  const config = agent.getConfig();

  // Redis v4+ uses different API
  if (redis.createClient) {
    const originalCreateClient = redis.createClient;
    redis.createClient = function (...args: any[]) {
      const client = originalCreateClient(...args);

      // Wrap command executor
      const originalSendCommand = client.sendCommand;
      if (originalSendCommand) {
        client.sendCommand = function (command: any[]) {
          if (!agent.shouldSample()) {
            return originalSendCommand.call(this, command);
          }

          const commandName = command[0] || 'unknown';

          const span = new SpanBuilder(
            `redis.${commandName}`,
            SpanKind.CLIENT,
            config.serviceName!,
            config.serviceVersion,
            config.environment,
            agent
          );

          span.setAttributes({
            'db.system': 'redis',
            'db.operation': commandName.toUpperCase(),
            'db.statement': command.join(' ').substring(0, 500),
          });

          const result = originalSendCommand.call(this, command);

          if (result && typeof result.then === 'function') {
            return result
              .then((res: any) => {
                span.setStatus(SpanStatus.OK);
                span.end();
                return res;
              })
              .catch((err: any) => {
                span.setStatus(SpanStatus.ERROR, err.message);
                span.setAttribute('error', true);
                span.end();
                throw err;
              });
          }

          span.end();
          return result;
        };
      }

      return client;
    };
  }

  if (config.debug) {
    console.log('[DevSkin Agent] Redis (node-redis) instrumentation enabled');
  }
}
