"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTraceId = generateTraceId;
exports.generateSpanId = generateSpanId;
exports.shouldSample = shouldSample;
const crypto_1 = require("crypto");
/**
 * Generate a random trace ID (16 bytes / 32 hex chars)
 */
function generateTraceId() {
    return (0, crypto_1.randomBytes)(16).toString('hex');
}
/**
 * Generate a random span ID (8 bytes / 16 hex chars)
 */
function generateSpanId() {
    return (0, crypto_1.randomBytes)(8).toString('hex');
}
/**
 * Check if a value should be sampled based on sample rate
 */
function shouldSample(sampleRate) {
    return Math.random() < sampleRate;
}
//# sourceMappingURL=id-generator.js.map