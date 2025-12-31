import { randomBytes } from 'crypto';

/**
 * Generate a random trace ID (16 bytes / 32 hex chars)
 */
export function generateTraceId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Generate a random span ID (8 bytes / 16 hex chars)
 */
export function generateSpanId(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Check if a value should be sampled based on sample rate
 */
export function shouldSample(sampleRate: number): boolean {
  return Math.random() < sampleRate;
}
