/**
 * Generate a random trace ID (16 bytes / 32 hex chars)
 */
export declare function generateTraceId(): string;
/**
 * Generate a random span ID (8 bytes / 16 hex chars)
 */
export declare function generateSpanId(): string;
/**
 * Check if a value should be sampled based on sample rate
 */
export declare function shouldSample(sampleRate: number): boolean;
//# sourceMappingURL=id-generator.d.ts.map