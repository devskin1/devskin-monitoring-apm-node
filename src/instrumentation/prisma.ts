import { Agent } from '../agent';
import { SpanBuilder } from '../span';
import { SpanKind, SpanStatus } from '../types';

/**
 * Instrument Prisma Client for database monitoring
 */
export function instrumentPrisma(agent: Agent): void {
  try {
    // Hook into Node's require system to intercept @prisma/client loads
    const Module = require('module');
    const originalRequire = Module.prototype.require;

    Module.prototype.require = function (id: string) {
      const module = originalRequire.apply(this, arguments);

      // Instrument @prisma/client when it's loaded
      if (id === '@prisma/client' && module.PrismaClient && !module.__devskin_instrumented) {
        instrumentPrismaClient(agent, module);
        module.__devskin_instrumented = true;
      }

      return module;
    };

    // Also try to instrument if already loaded
    try {
      const prismaModule = require('@prisma/client');
      if (prismaModule && prismaModule.PrismaClient && !prismaModule.__devskin_instrumented) {
        instrumentPrismaClient(agent, prismaModule);
        prismaModule.__devskin_instrumented = true;
      }
    } catch (e) {
      // @prisma/client not yet loaded or not installed
    }
  } catch (error: any) {
    if (agent.getConfig().debug) {
      console.error('[DevSkin Agent] Error instrumenting Prisma:', error.message);
    }
  }
}

/**
 * Instrument Prisma Client middleware
 */
function instrumentPrismaClient(agent: Agent, prismaModule: any): void {
  const originalPrismaClient = prismaModule.PrismaClient;

  // Wrap PrismaClient constructor to add middleware automatically
  prismaModule.PrismaClient = function (...args: any[]) {
    const client = new originalPrismaClient(...args);

    // Add middleware to intercept queries
    client.$use(async (params: any, next: any) => {
      const config = agent.getConfig();
      const span = new SpanBuilder(
        `prisma.${params.model}.${params.action}`,
        SpanKind.CLIENT,
        config.serviceName,
        config.serviceVersion,
        config.environment,
        agent
      );

      // Add database attributes
      span.setAttribute('db.system', 'prisma');
      span.setAttribute('db.operation', params.action);
      if (params.model) {
        span.setAttribute('db.sql.table', params.model);
      }
      
      // Add query parameters (safely, without sensitive data)
      if (params.args) {
        const safeArgs = sanitizePrismaArgs(params.args);
        if (Object.keys(safeArgs).length > 0) {
          span.setAttribute('db.prisma.args', JSON.stringify(safeArgs).substring(0, 1000));
        }
      }

      try {
        const result = await next(params);
        span.setStatus(SpanStatus.OK);
        
        // Add result metadata if available
        if (Array.isArray(result)) {
          span.setAttribute('db.rows_affected', result.length);
        }
        
        return result;
      } catch (error: any) {
        span.setStatus(SpanStatus.ERROR);
        span.recordError(error);
        throw error;
      } finally {
        span.end();
      }
    });

    return client;
  };

  // Copy over static properties
  Object.setPrototypeOf(prismaModule.PrismaClient, originalPrismaClient);
  Object.setPrototypeOf(prismaModule.PrismaClient.prototype, originalPrismaClient.prototype);
}

/**
 * Sanitize Prisma args to remove sensitive data
 */
function sanitizePrismaArgs(args: any): any {
  if (!args || typeof args !== 'object') {
    return {};
  }

  const sanitized: any = {};
  
  // Include safe fields like where, select, include, orderBy
  const safeFields = ['where', 'select', 'include', 'orderBy', 'take', 'skip'];
  for (const field of safeFields) {
    if (args[field] !== undefined) {
      sanitized[field] = sanitizeValue(args[field]);
    }
  }

  return sanitized;
}

/**
 * Sanitize values to prevent sensitive data leakage
 */
function sanitizeValue(value: any, depth = 0): any {
  if (depth > 3) return '[nested]';
  
  if (value === null || value === undefined) return value;
  
  if (Array.isArray(value)) {
    return value.slice(0, 5).map(v => sanitizeValue(v, depth + 1));
  }
  
  if (typeof value === 'object') {
    const sanitized: any = {};
    for (const key in value) {
      // Skip password and sensitive fields
      if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret')) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeValue(value[key], depth + 1);
      }
    }
    return sanitized;
  }
  
  return value;
}
