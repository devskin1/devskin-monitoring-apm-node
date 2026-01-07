"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instrumentMysql = instrumentMysql;
const span_1 = require("../span");
const types_1 = require("../types");
function instrumentMysql(agent) {
    try {
        const Module = require('module');
        const originalRequire = Module.prototype.require;
        Module.prototype.require = function (id) {
            const module = originalRequire.apply(this, arguments);
            if (id === 'mysql2' && module.Connection && !module.__devskin_instrumented) {
                instrumentMysql2(agent, module);
                module.__devskin_instrumented = true;
            }
            if (id === 'mysql2/promise') {
                const mysql2Base = require('mysql2');
                if (mysql2Base.Connection && !mysql2Base.__devskin_instrumented) {
                    instrumentMysql2(agent, mysql2Base);
                    mysql2Base.__devskin_instrumented = true;
                }
            }
            if (id === 'mysql' && module.Connection && !module.__devskin_instrumented) {
                instrumentMysqlLegacy(agent, module);
                module.__devskin_instrumented = true;
            }
            return module;
        };
        try {
            const mysql2 = require('mysql2');
            if (mysql2 && mysql2.Connection && !mysql2.__devskin_instrumented) {
                instrumentMysql2(agent, mysql2);
                mysql2.__devskin_instrumented = true;
            }
        }
        catch (e) {
        }
        try {
            const mysql2Promise = require('mysql2/promise');
            const mysql2Base = require('mysql2');
            if (mysql2Base && mysql2Base.Connection && !mysql2Base.__devskin_instrumented) {
                instrumentMysql2(agent, mysql2Base);
                mysql2Base.__devskin_instrumented = true;
            }
        }
        catch (e) {
        }
        try {
            const mysql = require('mysql');
            if (mysql && mysql.Connection && !mysql.__devskin_instrumented) {
                instrumentMysqlLegacy(agent, mysql);
                mysql.__devskin_instrumented = true;
            }
        }
        catch {
        }
    }
    catch (error) {
        if (agent.getConfig().debug) {
            console.error('[DevSkin Agent] Failed to instrument MySQL:', error.message);
        }
    }
}
function instrumentMysql2(agent, mysql2) {
    const config = agent.getConfig();
    const originalConnectionQuery = mysql2.Connection.prototype.query;
    const originalPoolQuery = mysql2.Pool ? mysql2.Pool.prototype.query : null;
    const originalPoolConnectionQuery = mysql2.PoolConnection ? mysql2.PoolConnection.prototype.query : null;
    mysql2.Connection.prototype.query = function (sql, values, callback) {
        if (!agent.shouldSample()) {
            return originalConnectionQuery.call(this, sql, values, callback);
        }
        let actualSql = sql;
        let actualValues = values;
        let actualCallback = callback;
        if (typeof sql === 'object') {
            actualSql = sql.sql;
            actualValues = sql.values;
        }
        if (typeof values === 'function') {
            actualCallback = values;
            actualValues = undefined;
        }
        const connectionConfig = this.config;
        const dbName = connectionConfig?.database || 'unknown';
        const host = connectionConfig?.host || 'localhost';
        const port = connectionConfig?.port || 3306;
        const user = connectionConfig?.user;
        const span = new span_1.SpanBuilder(`mysql.query`, types_1.SpanKind.CLIENT, config.serviceName, config.serviceVersion, config.environment, agent);
        const queryType = extractQueryType(actualSql);
        span.setAttributes({
            'db.system': 'mysql',
            'db.name': dbName,
            'db.statement': normalizeQuery(actualSql),
            'db.operation': queryType,
            'db.user': user,
            'net.peer.name': host,
            'net.peer.port': port,
            'db.connection_string': `mysql://${host}:${port}/${dbName}`,
        });
        span.setAttribute('span.kind', 'client');
        const startTime = Date.now();
        const wrappedCallback = (err, results, fields) => {
            const duration = Date.now() - startTime;
            if (err) {
                span.setStatus(types_1.SpanStatus.ERROR, err.message);
                span.setAttribute('error', true);
                span.setAttribute('error.message', err.message);
                span.setAttribute('error.type', err.code || 'Error');
            }
            else {
                span.setStatus(types_1.SpanStatus.OK);
                if (results) {
                    if (Array.isArray(results)) {
                        span.setAttribute('db.rows_affected', results.length);
                    }
                    else if (results.affectedRows !== undefined) {
                        span.setAttribute('db.rows_affected', results.affectedRows);
                    }
                }
            }
            span.end();
            if (actualCallback) {
                actualCallback(err, results, fields);
            }
        };
        if (actualCallback) {
            return originalConnectionQuery.call(this, actualSql, actualValues, wrappedCallback);
        }
        else {
            const query = originalConnectionQuery.call(this, actualSql, actualValues);
            return query
                .then((results) => {
                const duration = Date.now() - startTime;
                span.setStatus(types_1.SpanStatus.OK);
                if (results && results[0]) {
                    if (Array.isArray(results[0])) {
                        span.setAttribute('db.rows_affected', results[0].length);
                    }
                    else if (results[0].affectedRows !== undefined) {
                        span.setAttribute('db.rows_affected', results[0].affectedRows);
                    }
                }
                span.end();
                return results;
            })
                .catch((err) => {
                const duration = Date.now() - startTime;
                span.setStatus(types_1.SpanStatus.ERROR, err.message);
                span.setAttribute('error', true);
                span.setAttribute('error.message', err.message);
                span.setAttribute('error.type', err.code || 'Error');
                span.end();
                throw err;
            });
        }
    };
    if (mysql2.Pool && mysql2.Pool.prototype.query && originalPoolQuery) {
        const originalPoolQueryMethod = originalPoolQuery;
        mysql2.Pool.prototype.query = function (sql, values, callback) {
            return originalPoolQueryMethod.call(this, sql, values, callback);
        };
    }
    if (mysql2.PoolConnection && mysql2.PoolConnection.prototype.query && originalPoolConnectionQuery) {
        mysql2.PoolConnection.prototype.query = function (sql, values, callback) {
            if (!agent.shouldSample()) {
                return originalPoolConnectionQuery.call(this, sql, values, callback);
            }
            let actualSql = sql;
            let actualValues = values;
            let actualCallback = callback;
            if (typeof sql === 'object') {
                actualSql = sql.sql;
                actualValues = sql.values;
            }
            if (typeof values === 'function') {
                actualCallback = values;
                actualValues = undefined;
            }
            const connectionConfig = this.config;
            const dbName = connectionConfig?.database || 'unknown';
            const host = connectionConfig?.host || 'localhost';
            const port = connectionConfig?.port || 3306;
            const user = connectionConfig?.user;
            const span = new span_1.SpanBuilder(`mysql.query`, types_1.SpanKind.CLIENT, config.serviceName, config.serviceVersion, config.environment, agent);
            const queryType = extractQueryType(actualSql);
            span.setAttributes({
                'db.system': 'mysql',
                'db.name': dbName,
                'db.statement': normalizeQuery(actualSql),
                'db.operation': queryType,
                'db.user': user,
                'net.peer.name': host,
                'net.peer.port': port,
                'db.connection_string': `mysql://${host}:${port}/${dbName}`,
            });
            span.setAttribute('span.kind', 'client');
            const startTime = Date.now();
            const wrappedCallback = (err, results, fields) => {
                if (err) {
                    span.setStatus(types_1.SpanStatus.ERROR, err.message);
                    span.setAttribute('error', true);
                    span.setAttribute('error.message', err.message);
                    span.setAttribute('error.type', err.code || 'Error');
                }
                else {
                    span.setStatus(types_1.SpanStatus.OK);
                    if (results) {
                        if (Array.isArray(results)) {
                            span.setAttribute('db.rows_affected', results.length);
                        }
                        else if (results.affectedRows !== undefined) {
                            span.setAttribute('db.rows_affected', results.affectedRows);
                        }
                    }
                }
                span.end();
                if (actualCallback) {
                    actualCallback(err, results, fields);
                }
            };
            if (actualCallback) {
                return originalPoolConnectionQuery.call(this, actualSql, actualValues, wrappedCallback);
            }
            else {
                const query = originalPoolConnectionQuery.call(this, actualSql, actualValues);
                return query
                    .then((results) => {
                    span.setStatus(types_1.SpanStatus.OK);
                    if (results && results[0]) {
                        if (Array.isArray(results[0])) {
                            span.setAttribute('db.rows_affected', results[0].length);
                        }
                        else if (results[0].affectedRows !== undefined) {
                            span.setAttribute('db.rows_affected', results[0].affectedRows);
                        }
                    }
                    span.end();
                    return results;
                })
                    .catch((err) => {
                    span.setStatus(types_1.SpanStatus.ERROR, err.message);
                    span.setAttribute('error', true);
                    span.setAttribute('error.message', err.message);
                    span.setAttribute('error.type', err.code || 'Error');
                    span.end();
                    throw err;
                });
            }
        };
    }
    if (config.debug) {
        console.log('[DevSkin Agent] MySQL2 instrumentation enabled');
    }
}
function instrumentMysqlLegacy(agent, mysql) {
    const config = agent.getConfig();
    const originalQuery = mysql.Connection.prototype.query;
    mysql.Connection.prototype.query = function (sql, values, callback) {
        if (!agent.shouldSample()) {
            return originalQuery.call(this, sql, values, callback);
        }
        let actualSql = sql;
        let actualValues = values;
        let actualCallback = callback;
        if (typeof sql === 'object') {
            actualSql = sql.sql;
            actualValues = sql.values;
        }
        if (typeof values === 'function') {
            actualCallback = values;
            actualValues = undefined;
        }
        const connectionConfig = this.config;
        const dbName = connectionConfig?.database || 'unknown';
        const host = connectionConfig?.host || 'localhost';
        const port = connectionConfig?.port || 3306;
        const user = connectionConfig?.user;
        const span = new span_1.SpanBuilder(`mysql.query`, types_1.SpanKind.CLIENT, config.serviceName, config.serviceVersion, config.environment, agent);
        const queryType = extractQueryType(actualSql);
        span.setAttributes({
            'db.system': 'mysql',
            'db.name': dbName,
            'db.statement': normalizeQuery(actualSql),
            'db.operation': queryType,
            'db.user': user,
            'net.peer.name': host,
            'net.peer.port': port,
            'db.connection_string': `mysql://${host}:${port}/${dbName}`,
        });
        span.setAttribute('span.kind', 'client');
        const startTime = Date.now();
        const wrappedCallback = (err, results, fields) => {
            if (err) {
                span.setStatus(types_1.SpanStatus.ERROR, err.message);
                span.setAttribute('error', true);
                span.setAttribute('error.message', err.message);
            }
            else {
                span.setStatus(types_1.SpanStatus.OK);
                if (results) {
                    if (Array.isArray(results)) {
                        span.setAttribute('db.rows_affected', results.length);
                    }
                    else if (results.affectedRows !== undefined) {
                        span.setAttribute('db.rows_affected', results.affectedRows);
                    }
                }
            }
            span.end();
            if (actualCallback) {
                actualCallback(err, results, fields);
            }
        };
        return originalQuery.call(this, actualSql, actualValues, wrappedCallback);
    };
    if (config.debug) {
        console.log('[DevSkin Agent] MySQL (legacy) instrumentation enabled');
    }
}
function extractQueryType(sql) {
    if (typeof sql !== 'string')
        return 'unknown';
    const normalized = sql.trim().toUpperCase();
    if (normalized.startsWith('SELECT'))
        return 'SELECT';
    if (normalized.startsWith('INSERT'))
        return 'INSERT';
    if (normalized.startsWith('UPDATE'))
        return 'UPDATE';
    if (normalized.startsWith('DELETE'))
        return 'DELETE';
    if (normalized.startsWith('CREATE'))
        return 'CREATE';
    if (normalized.startsWith('DROP'))
        return 'DROP';
    if (normalized.startsWith('ALTER'))
        return 'ALTER';
    if (normalized.startsWith('TRUNCATE'))
        return 'TRUNCATE';
    return 'unknown';
}
function normalizeQuery(sql) {
    if (typeof sql !== 'string')
        return String(sql);
    let normalized = sql.substring(0, 10000);
    normalized = normalized.replace(/\s+/g, ' ').trim();
    return normalized;
}
//# sourceMappingURL=mysql.js.map