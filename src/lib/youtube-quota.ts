import { Redis } from '@upstash/redis'

// YouTube API quota costs
// See: https://developers.google.com/youtube/v3/determine_quota_cost
const QUOTA_COSTS = {
  search: 100,    // search.list costs 100 units
  videos: 1,      // videos.list costs 1 unit per request
} as const

// Daily quota limit (default for most API keys)
const DAILY_QUOTA_LIMIT = 10000

// Initialize Redis client
let redis: Redis | null = null
let quotaTrackingEnabled = false

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    quotaTrackingEnabled = true
  }
} catch (error) {
  console.warn('[YouTube Quota] Failed to initialize Redis:', error)
}

/**
 * Get the Redis key for today's quota
 */
function getQuotaKey(): string {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  return `youtube:quota:${today}`
}

/**
 * Check if there's enough quota remaining for an operation
 */
export async function checkYouTubeQuota(
  operation: keyof typeof QUOTA_COSTS = 'search'
): Promise<{ available: boolean; remaining: number; cost: number }> {
  const cost = QUOTA_COSTS[operation]

  if (!quotaTrackingEnabled || !redis) {
    // If quota tracking is not available, assume quota is available
    return { available: true, remaining: DAILY_QUOTA_LIMIT, cost }
  }

  try {
    const key = getQuotaKey()
    const used = await redis.get<number>(key) || 0
    const remaining = DAILY_QUOTA_LIMIT - used

    return {
      available: remaining >= cost,
      remaining,
      cost,
    }
  } catch (error) {
    console.error('[YouTube Quota] Error checking quota:', error)
    // On error, assume quota is available (fail open)
    return { available: true, remaining: DAILY_QUOTA_LIMIT, cost }
  }
}

/**
 * Consume YouTube API quota units
 */
export async function consumeYouTubeQuota(
  operation: keyof typeof QUOTA_COSTS = 'search'
): Promise<void> {
  if (!quotaTrackingEnabled || !redis) {
    return
  }

  const cost = QUOTA_COSTS[operation]

  try {
    const key = getQuotaKey()
    await redis.incrby(key, cost)
    // Set TTL to 25 hours to ensure it expires after the day ends
    await redis.expire(key, 25 * 60 * 60)
  } catch (error) {
    console.error('[YouTube Quota] Error consuming quota:', error)
  }
}

/**
 * Get current quota usage statistics
 */
export async function getQuotaStats(): Promise<{
  used: number
  remaining: number
  limit: number
  percentUsed: number
}> {
  if (!quotaTrackingEnabled || !redis) {
    return {
      used: 0,
      remaining: DAILY_QUOTA_LIMIT,
      limit: DAILY_QUOTA_LIMIT,
      percentUsed: 0,
    }
  }

  try {
    const key = getQuotaKey()
    const used = await redis.get<number>(key) || 0
    const remaining = Math.max(0, DAILY_QUOTA_LIMIT - used)

    return {
      used,
      remaining,
      limit: DAILY_QUOTA_LIMIT,
      percentUsed: Math.round((used / DAILY_QUOTA_LIMIT) * 100),
    }
  } catch (error) {
    console.error('[YouTube Quota] Error getting stats:', error)
    return {
      used: 0,
      remaining: DAILY_QUOTA_LIMIT,
      limit: DAILY_QUOTA_LIMIT,
      percentUsed: 0,
    }
  }
}

/**
 * Generate a placeholder thumbnail URL when quota is exceeded
 */
export function getPlaceholderThumbnail(): string {
  return `https://picsum.photos/seed/${Date.now()}/480/360`
}

/**
 * Check if quota tracking is enabled
 */
export function isQuotaTrackingEnabled(): boolean {
  return quotaTrackingEnabled
}
