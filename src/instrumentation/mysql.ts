import { Agent } from '../agent';
import { SpanBuilder } from '../span';
import { SpanKind, SpanStatus } from '../types';

/**
 * Instrument MySQL and MySQL2 drivers for database monitoring
 */
export function instrumentMysql(agent: Agent): void {
  try {
    // Try to require mysql2
    let mysql2: any;
    try {
      mysql2 = require('mysql2');
    } catch {
      // mysql2 not installed
    }

    if (mysql2) {
      instrumentMysql2(agent, mysql2);
    }

    // Try to require mysql
    let mysql: any;
    try {
      mysql = require('mysql');
    } catch {
      // mysql not installed
    }

    if (mysql) {
      instrumentMysqlLegacy(agent, mysql);
    }
  } catch (error: any) {
    if (agent.getConfig().debug) {
      console.error('[DevSkin Agent] Failed to instrument MySQL:', error.message);
    }
  }
}

/**
 * Instrument mysql2 driver
 */
function instrumentMysql2(agent: Agent, mysql2: any): void {
  const config = agent.getConfig();

  // Patch Connection.prototype.query
  const originalQuery = mysql2.Connection.prototype.query;
  mysql2.Connection.prototype.query = function (sql: any, values: any, callback: any) {
    if (!agent.shouldSample()) {
      return originalQuery.call(this, sql, values, callback);
    }

    // Handle different call signatures
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

    // Extract connection info
    const connectionConfig = this.config;
    const dbName = connectionConfig?.database || 'unknown';
    const host = connectionConfig?.host || 'localhost';
    const port = connectionConfig?.port || 3306;
    const user = connectionConfig?.user;

    // Create span for the query
    const span = new SpanBuilder(
      `mysql.query`,
      SpanKind.CLIENT,
      config.serviceName!,
      config.serviceVersion,
      config.environment,
      agent
    );

    // Extract query type (SELECT, INSERT, UPDATE, etc.)
    const queryType = extractQueryType(actualSql);

    // Set database attributes following OpenTelemetry semantic conventions
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

    // Wrap callback to capture result/error
    const wrappedCallback = (err: any, results: any, fields: any) => {
      const duration = Date.now() - startTime;

      if (err) {
        span.setStatus(SpanStatus.ERROR, err.message);
        span.setAttribute('error', true);
        span.setAttribute('error.message', err.message);
        span.setAttribute('error.type', err.code || 'Error');
      } else {
        span.setStatus(SpanStatus.OK);
        // Add result metadata
        if (results) {
          if (Array.isArray(results)) {
            span.setAttribute('db.rows_affected', results.length);
          } else if (results.affectedRows !== undefined) {
            span.setAttribute('db.rows_affected', results.affectedRows);
          }
        }
      }

      span.end();

      if (actualCallback) {
        actualCallback(err, results, fields);
      }
    };

    // Call original query with wrapped callback
    if (actualCallback) {
      return originalQuery.call(this, actualSql, actualValues, wrappedCallback);
    } else {
      // Promise-based query
      const query = originalQuery.call(this, actualSql, actualValues);

      // Wrap promise
      return query
        .then((results: any) => {
          const duration = Date.now() - startTime;
          span.setStatus(SpanStatus.OK);
          if (results && results[0]) {
            if (Array.isArray(results[0])) {
              span.setAttribute('db.rows_affected', results[0].length);
            } else if (results[0].affectedRows !== undefined) {
              span.setAttribute('db.rows_affected', results[0].affectedRows);
            }
          }
          span.end();
          return results;
        })
        .catch((err: any) => {
          const duration = Date.now() - startTime;
          span.setStatus(SpanStatus.ERROR, err.message);
          span.setAttribute('error', true);
          span.setAttribute('error.message', err.message);
          span.setAttribute('error.type', err.code || 'Error');
          span.end();
          throw err;
        });
    }
  };

  if (config.debug) {
    console.log('[DevSkin Agent] MySQL2 instrumentation enabled');
  }
}

/**
 * Instrument legacy mysql driver
 */
function instrumentMysqlLegacy(agent: Agent, mysql: any): void {
  const config = agent.getConfig();

  // Similar implementation for mysql driver
  const originalQuery = mysql.Connection.prototype.query;
  mysql.Connection.prototype.query = function (sql: any, values: any, callback: any) {
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

    const span = new SpanBuilder(
      `mysql.query`,
      SpanKind.CLIENT,
      config.serviceName!,
      config.serviceVersion,
      config.environment,
      agent
    );

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

    const wrappedCallback = (err: any, results: any, fields: any) => {
      if (err) {
        span.setStatus(SpanStatus.ERROR, err.message);
        span.setAttribute('error', true);
        span.setAttribute('error.message', err.message);
      } else {
        span.setStatus(SpanStatus.OK);
        if (results) {
          if (Array.isArray(results)) {
            span.setAttribute('db.rows_affected', results.length);
          } else if (results.affectedRows !== undefined) {
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

/**
 * Extract query type from SQL statement
 */
function extractQueryType(sql: string): string {
  if (typeof sql !== 'string') return 'unknown';

  const normalized = sql.trim().toUpperCase();

  if (normalized.startsWith('SELECT')) return 'SELECT';
  if (normalized.startsWith('INSERT')) return 'INSERT';
  if (normalized.startsWith('UPDATE')) return 'UPDATE';
  if (normalized.startsWith('DELETE')) return 'DELETE';
  if (normalized.startsWith('CREATE')) return 'CREATE';
  if (normalized.startsWith('DROP')) return 'DROP';
  if (normalized.startsWith('ALTER')) return 'ALTER';
  if (normalized.startsWith('TRUNCATE')) return 'TRUNCATE';

  return 'unknown';
}

/**
 * Normalize query for better grouping
 * Remove sensitive data while keeping structure
 */
function normalizeQuery(sql: string): string {
  if (typeof sql !== 'string') return String(sql);

  // Limit length to avoid huge spans
  let normalized = sql.substring(0, 10000);

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}
