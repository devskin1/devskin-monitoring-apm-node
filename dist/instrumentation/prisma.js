"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instrumentPrisma = instrumentPrisma;
const span_1 = require("../span");
const types_1 = require("../types");
function instrumentPrisma(agent) {
    try {
        const Module = require('module');
        const originalRequire = Module.prototype.require;
        Module.prototype.require = function (id) {
            const module = originalRequire.apply(this, arguments);
            if (id === '@prisma/client' && module.PrismaClient && !module.__devskin_instrumented) {
                instrumentPrismaClient(agent, module);
                module.__devskin_instrumented = true;
            }
            return module;
        };
        try {
            const prismaModule = require('@prisma/client');
            if (prismaModule && prismaModule.PrismaClient && !prismaModule.__devskin_instrumented) {
                instrumentPrismaClient(agent, prismaModule);
                prismaModule.__devskin_instrumented = true;
            }
        }
        catch (e) {
        }
    }
    catch (error) {
        if (agent.getConfig().debug) {
            console.error('[DevSkin Agent] Error instrumenting Prisma:', error.message);
        }
    }
}
function instrumentPrismaClient(agent, prismaModule) {
    const originalPrismaClient = prismaModule.PrismaClient;
    prismaModule.PrismaClient = function (...args) {
        const client = new originalPrismaClient(...args);
        client.$use(async (params, next) => {
            const config = agent.getConfig();
            const span = new span_1.SpanBuilder(`prisma.${params.model}.${params.action}`, types_1.SpanKind.CLIENT, config.serviceName, config.serviceVersion, config.environment, agent);
            span.setAttribute('db.system', 'prisma');
            span.setAttribute('db.operation', params.action);
            if (params.model) {
                span.setAttribute('db.sql.table', params.model);
            }
            if (params.args) {
                const safeArgs = sanitizePrismaArgs(params.args);
                if (Object.keys(safeArgs).length > 0) {
                    span.setAttribute('db.prisma.args', JSON.stringify(safeArgs).substring(0, 1000));
                }
            }
            try {
                const result = await next(params);
                span.setStatus(types_1.SpanStatus.OK);
                if (Array.isArray(result)) {
                    span.setAttribute('db.rows_affected', result.length);
                }
                return result;
            }
            catch (error) {
                span.setStatus(types_1.SpanStatus.ERROR);
                span.recordError(error);
                throw error;
            }
            finally {
                span.end();
            }
        });
        return client;
    };
    Object.setPrototypeOf(prismaModule.PrismaClient, originalPrismaClient);
    Object.setPrototypeOf(prismaModule.PrismaClient.prototype, originalPrismaClient.prototype);
}
function sanitizePrismaArgs(args) {
    if (!args || typeof args !== 'object') {
        return {};
    }
    const sanitized = {};
    const safeFields = ['where', 'select', 'include', 'orderBy', 'take', 'skip'];
    for (const field of safeFields) {
        if (args[field] !== undefined) {
            sanitized[field] = sanitizeValue(args[field]);
        }
    }
    return sanitized;
}
function sanitizeValue(value, depth = 0) {
    if (depth > 3)
        return '[nested]';
    if (value === null || value === undefined)
        return value;
    if (Array.isArray(value)) {
        return value.slice(0, 5).map(v => sanitizeValue(v, depth + 1));
    }
    if (typeof value === 'object') {
        const sanitized = {};
        for (const key in value) {
            if (key.toLowerCase().includes('password') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret')) {
                sanitized[key] = '[REDACTED]';
            }
            else {
                sanitized[key] = sanitizeValue(value[key], depth + 1);
            }
        }
        return sanitized;
    }
    return value;
}
//# sourceMappingURL=prisma.js.map