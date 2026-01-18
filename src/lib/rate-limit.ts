import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize Redis client - will use env vars UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
// If not configured, rate limiting will be disabled gracefully
let redis: Redis | null = null
let rateLimitEnabled = false

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    rateLimitEnabled = true
  }
} catch (error) {
  console.warn('[Rate Limit] Failed to initialize Redis:', error)
}

// Rate limit configurations for different endpoints
// Using sliding window algorithm for smooth rate limiting
export const rateLimits = {
  // AI generation: 10 requests per minute per user
  aiGenerate: rateLimitEnabled && redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 m'),
        prefix: 'ratelimit:ai:generate',
        analytics: true,
      })
    : null,

  // AI swap: 20 requests per minute per user
  aiSwap: rateLimitEnabled && redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, '1 m'),
        prefix: 'ratelimit:ai:swap',
        analytics: true,
      })
    : null,

  // YouTube search/enrich: 30 requests per minute per user
  youtube: rateLimitEnabled && redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, '1 m'),
        prefix: 'ratelimit:youtube',
        analytics: true,
      })
    : null,

  // General API: 100 requests per minute per IP (for unauthenticated endpoints)
  general: rateLimitEnabled && redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '1 m'),
        prefix: 'ratelimit:general',
        analytics: true,
      })
    : null,
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Check rate limit for a given limiter and identifier
 * @param limiter - The rate limiter to use (from rateLimits)
 * @param identifier - Unique identifier (usually user email or IP)
 * @returns RateLimitResult with success status and limit info
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<RateLimitResult> {
  // If rate limiting is not configured
  if (!limiter) {
    // FAIL CLOSED in production - rate limiting is required
    if (process.env.NODE_ENV === 'production') {
      console.error('[Rate Limit] CRITICAL: Rate limiting not configured in production!')
      return {
        success: false,
        limit: 0,
        remaining: 0,
        reset: Date.now() + 60000, // Retry in 1 minute
      }
    }
    // Allow in development
    return {
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: Date.now(),
    }
  }

  try {
    const result = await limiter.limit(identifier)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch (error) {
    console.error('[Rate Limit] Error checking rate limit:', error)
    // FAIL CLOSED in production - deny request on Redis errors
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        limit: 0,
        remaining: 0,
        reset: Date.now() + 10000, // Retry in 10 seconds
      }
    }
    // Fail open in development to avoid blocking
    return {
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: Date.now(),
    }
  }
}

/**
 * Create rate limit response headers
 */
export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
    ...(result.success ? {} : {
      'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
    }),
  }
}

/**
 * Check if rate limiting is enabled
 */
export function isRateLimitEnabled(): boolean {
  return rateLimitEnabled
}
