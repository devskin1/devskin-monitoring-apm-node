"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instrumentMongoDB = instrumentMongoDB;
const span_1 = require("../span");
const types_1 = require("../types");
function instrumentMongoDB(agent) {
    try {
        let mongodb;
        try {
            mongodb = require('mongodb');
        }
        catch {
            return;
        }
        const config = agent.getConfig();
        const methods = [
            'find', 'findOne', 'insertOne', 'insertMany',
            'updateOne', 'updateMany', 'deleteOne', 'deleteMany',
            'aggregate', 'countDocuments', 'distinct', 'findOneAndUpdate',
            'findOneAndDelete', 'findOneAndReplace', 'replaceOne', 'bulkWrite'
        ];
        for (const method of methods) {
            const original = mongodb.Collection.prototype[method];
            if (!original)
                continue;
            mongodb.Collection.prototype[method] = function (...args) {
                if (!agent.shouldSample()) {
                    return original.apply(this, args);
                }
                const collectionName = this.collectionName;
                const dbName = this.s?.db?.databaseName || this.namespace?.db || 'unknown';
                const connectionString = this.s?.db?.s?.client?.s?.url || '';
                let host = 'localhost';
                let port = 27017;
                try {
                    const url = new URL(connectionString);
                    host = url.hostname || 'localhost';
                    port = parseInt(url.port) || 27017;
                }
                catch { }
                const span = new span_1.SpanBuilder(`mongodb.${method}`, types_1.SpanKind.CLIENT, config.serviceName, config.serviceVersion, config.environment, agent);
                span.setAttributes({
                    'db.system': 'mongodb',
                    'db.name': dbName,
                    'db.mongodb.collection': collectionName,
                    'db.operation': method,
                    'net.peer.name': host,
                    'net.peer.port': port,
                    'db.connection_string': connectionString.replace(/\/\/[^@]*@/, '//***@'),
                });
                if (args[0]) {
                    if (typeof args[0] === 'object') {
                        span.setAttribute('db.statement', JSON.stringify(args[0]).substring(0, 1000));
                    }
                }
                span.setAttribute('span.kind', 'client');
                const startTime = Date.now();
                const result = original.apply(this, args);
                if (result && typeof result.then === 'function') {
                    return result
                        .then((res) => {
                        span.setStatus(types_1.SpanStatus.OK);
                        if (res) {
                            if (res.insertedCount !== undefined) {
                                span.setAttribute('db.rows_affected', res.insertedCount);
                            }
                            else if (res.modifiedCount !== undefined) {
                                span.setAttribute('db.rows_affected', res.modifiedCount);
                            }
                            else if (res.deletedCount !== undefined) {
                                span.setAttribute('db.rows_affected', res.deletedCount);
                            }
                            else if (Array.isArray(res)) {
                                span.setAttribute('db.rows_affected', res.length);
                            }
                        }
                        span.end();
                        return res;
                    })
                        .catch((err) => {
                        span.setStatus(types_1.SpanStatus.ERROR, err.message);
                        span.setAttribute('error', true);
                        span.setAttribute('error.message', err.message);
                        span.setAttribute('error.type', err.name || 'Error');
                        span.end();
                        throw err;
                    });
                }
                if (result && typeof result.toArray === 'function') {
                    const originalToArray = result.toArray;
                    result.toArray = function () {
                        return originalToArray.call(this)
                            .then((docs) => {
                            span.setStatus(types_1.SpanStatus.OK);
                            span.setAttribute('db.rows_affected', docs.length);
                            span.end();
                            return docs;
                        })
                            .catch((err) => {
                            span.setStatus(types_1.SpanStatus.ERROR, err.message);
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
    }
    catch (error) {
        if (agent.getConfig().debug) {
            console.error('[DevSkin Agent] Failed to instrument MongoDB:', error.message);
        }
    }
}
//# sourceMappingURL=mongodb.js.map