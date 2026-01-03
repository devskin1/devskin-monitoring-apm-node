"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instrumentRedis = instrumentRedis;
const span_1 = require("../span");
const types_1 = require("../types");
function instrumentRedis(agent) {
    try {
        let ioredis;
        try {
            ioredis = require('ioredis');
            instrumentIORedis(agent, ioredis);
        }
        catch { }
        let redis;
        try {
            redis = require('redis');
            instrumentNodeRedis(agent, redis);
        }
        catch { }
    }
    catch (error) {
        if (agent.getConfig().debug) {
            console.error('[DevSkin Agent] Failed to instrument Redis:', error.message);
        }
    }
}
function instrumentIORedis(agent, ioredis) {
    const config = agent.getConfig();
    const originalSendCommand = ioredis.prototype.sendCommand;
    ioredis.prototype.sendCommand = function (command, ...args) {
        if (!agent.shouldSample()) {
            return originalSendCommand.call(this, command, ...args);
        }
        const commandName = command?.name || 'unknown';
        const commandArgs = command?.args || [];
        const host = this.options?.host || 'localhost';
        const port = this.options?.port || 6379;
        const db = this.options?.db || 0;
        const span = new span_1.SpanBuilder(`redis.${commandName}`, types_1.SpanKind.CLIENT, config.serviceName, config.serviceVersion, config.environment, agent);
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
        const result = originalSendCommand.call(this, command, ...args);
        if (result && typeof result.then === 'function') {
            return result
                .then((res) => {
                span.setStatus(types_1.SpanStatus.OK);
                span.end();
                return res;
            })
                .catch((err) => {
                span.setStatus(types_1.SpanStatus.ERROR, err.message);
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
function instrumentNodeRedis(agent, redis) {
    const config = agent.getConfig();
    if (redis.createClient) {
        const originalCreateClient = redis.createClient;
        redis.createClient = function (...args) {
            const client = originalCreateClient(...args);
            const originalSendCommand = client.sendCommand;
            if (originalSendCommand) {
                client.sendCommand = function (command) {
                    if (!agent.shouldSample()) {
                        return originalSendCommand.call(this, command);
                    }
                    const commandName = command[0] || 'unknown';
                    const span = new span_1.SpanBuilder(`redis.${commandName}`, types_1.SpanKind.CLIENT, config.serviceName, config.serviceVersion, config.environment, agent);
                    span.setAttributes({
                        'db.system': 'redis',
                        'db.operation': commandName.toUpperCase(),
                        'db.statement': command.join(' ').substring(0, 500),
                    });
                    const result = originalSendCommand.call(this, command);
                    if (result && typeof result.then === 'function') {
                        return result
                            .then((res) => {
                            span.setStatus(types_1.SpanStatus.OK);
                            span.end();
                            return res;
                        })
                            .catch((err) => {
                            span.setStatus(types_1.SpanStatus.ERROR, err.message);
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
//# sourceMappingURL=redis.js.map