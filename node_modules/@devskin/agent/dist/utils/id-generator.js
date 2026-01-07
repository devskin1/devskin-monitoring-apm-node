"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTraceId = generateTraceId;
exports.generateSpanId = generateSpanId;
exports.shouldSample = shouldSample;
const crypto_1 = require("crypto");
function generateTraceId() {
    return (0, crypto_1.randomBytes)(16).toString('hex');
}
function generateSpanId() {
    return (0, crypto_1.randomBytes)(8).toString('hex');
}
function shouldSample(sampleRate) {
    return Math.random() < sampleRate;
}
//# sourceMappingURL=id-generator.js.map