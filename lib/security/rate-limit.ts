/**
 * Rate Limiting with Upstash Redis
 * Prevents abuse and controls API costs
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { LRUCache } from "lru-cache";
import { logger } from "@/lib/utils/logger";

// Initialize Redis client
// For development: uses in-memory storage if Upstash not configured
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

/**
 * Rate limiter for AI queries
 * Limit: 10 queries per minute per user
 */
export const queryRatelimit = redis
  ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
    prefix: "ratelimit:query",
  })
  : null;

/**
 * Rate limiter for login attempts
 * Limit: 5 attempts per 5 minutes per IP
 */
export const loginRatelimit = redis
  ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "5 m"),
    analytics: true,
    prefix: "ratelimit:login",
  })
  : null;

/**
 * Rate limiter for query scoring operations
 * Limit: 30 scoring requests per minute per user
 */
export const scoringRatelimit = redis
  ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: true,
    prefix: "ratelimit:scoring",
  })
  : null;

// ============================================
// In-memory fallback (development)
// ============================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const inMemoryCache = new LRUCache<string, RateLimitEntry>({
  max: 1000, // Track up to 1000 identifiers
  ttl: 60 * 1000, // 1 minute window
});

/**
 * Check rate limit for AI queries
 * Uses a local in-memory bucket first to avoid Upstash round-trip on most requests.
 * Only syncs to Upstash when local count reaches 80% of the limit.
 */
export async function checkQueryRateLimit(userId: string): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const limit = 10;
  const windowMs = 60 * 1000;
  const now = Date.now();

  const entry = inMemoryCache.get(userId);

  if (!entry || entry.resetAt < now) {
    inMemoryCache.set(userId, { count: 1, resetAt: now + windowMs });
    return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
  }

  if (entry.count >= limit) {
    logger.warn('[RATE_LIMIT] Query limit exceeded', { userId, limit });
    return { success: false, limit, remaining: 0, reset: entry.resetAt };
  }

  entry.count++;
  inMemoryCache.set(userId, entry);

  // Sync to Upstash only when approaching the limit (80%+) for accurate distributed counting
  if (queryRatelimit && entry.count >= Math.ceil(limit * 0.8)) {
    const result = await queryRatelimit.limit(userId);
    if (!result.success) {
      logger.warn('[RATE_LIMIT] Query limit exceeded (Upstash)', {
        userId,
        limit: result.limit,
        reset: result.reset,
        remaining: result.remaining,
      });
      return result;
    }
    return result;
  }

  return { success: true, limit, remaining: limit - entry.count, reset: entry.resetAt };
}

/**
 * Check rate limit for login attempts
 * Uses IP address as identifier
 */
export async function checkLoginRateLimit(ip: string): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  if (!loginRatelimit) {
    // If Upstash not configured, allow all requests (development mode)
    return {
      success: true,
      limit: 5,
      remaining: 5,
      reset: Date.now() + 300000,
    };
  }

  const result = await loginRatelimit.limit(ip);

  if (!result.success) {
    logger.warn('[RATE_LIMIT] Login limit exceeded', {
      ip,
      limit: result.limit,
      reset: result.reset,
      remaining: result.remaining,
    });
  }

  return result;
}

/**
 * Check rate limit for query scoring operations
 * Uses local bucket first, syncs to Upstash at 80% threshold.
 */
export async function checkScoringRateLimit(userId: string): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const limit = 30;
  const windowMs = 60 * 1000;
  const now = Date.now();
  const key = `scoring:${userId}`;

  const entry = inMemoryCache.get(key);

  if (!entry || entry.resetAt < now) {
    inMemoryCache.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
  }

  if (entry.count >= limit) {
    logger.warn('[RATE_LIMIT] Scoring limit exceeded', { userId, limit });
    return { success: false, limit, remaining: 0, reset: entry.resetAt };
  }

  entry.count++;
  inMemoryCache.set(key, entry);

  if (scoringRatelimit && entry.count >= Math.ceil(limit * 0.8)) {
    const result = await scoringRatelimit.limit(userId);
    if (!result.success) {
      logger.warn('[RATE_LIMIT] Scoring limit exceeded (Upstash)', {
        userId,
        limit: result.limit,
        reset: result.reset,
        remaining: result.remaining,
      });
      return result;
    }
    return result;
  }

  return { success: true, limit, remaining: limit - entry.count, reset: entry.resetAt };
}

/**
 * Helper to get formatted rate limit error message
 */
export function getRateLimitErrorMessage(resetTime: number): string {
  const resetDate = new Date(resetTime);
  const now = new Date();
  const diffMs = resetDate.getTime() - now.getTime();
  const diffSec = Math.ceil(diffMs / 1000);

  if (diffSec < 60) {
    return `Rate limit exceeded. Try again in ${diffSec} seconds.`;
  }

  const diffMin = Math.ceil(diffSec / 60);
  return `Rate limit exceeded. Try again in ${diffMin} minute${diffMin > 1 ? "s" : ""}.`;
}
