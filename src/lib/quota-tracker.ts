/**
 * API Quota Tracker
 *
 * Tracks usage of external APIs (AI providers, YouTube) for monitoring.
 * Uses Upstash Redis for storage with daily keys.
 */

import { Redis } from '@upstash/redis'

// Initialize Redis client (optional - gracefully handles missing config)
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

type QuotaCategory =
  | 'ai:openai'
  | 'ai:anthropic'
  | 'ai:google'
  | 'youtube:search'
  | 'youtube:enrich'
  | 'credits:consumed'
  | 'generation:success'
  | 'generation:failure'

interface QuotaEntry {
  count: number
  tokens?: number
  lastUpdated: string
}

interface DailyQuotaReport {
  date: string
  categories: Record<string, QuotaEntry>
  totals: {
    aiCalls: number
    youtubeCalls: number
    creditsConsumed: number
    generationsSuccess: number
    generationsFailure: number
  }
}

/**
 * Get the Redis key for a given category and date
 */
function getQuotaKey(category: QuotaCategory, date?: Date): string {
  const d = date || new Date()
  const dateStr = d.toISOString().split('T')[0] // YYYY-MM-DD
  return `quota:${dateStr}:${category}`
}

/**
 * Track an API call
 */
export async function trackApiCall(
  category: QuotaCategory,
  tokens?: number
): Promise<void> {
  if (!redis) {
    // Silent no-op if Redis not configured
    return
  }

  try {
    const key = getQuotaKey(category)
    const countKey = `${key}:count`
    const tokensKey = `${key}:tokens`

    // Increment count
    await redis.incr(countKey)

    // Add tokens if provided
    if (tokens !== undefined) {
      await redis.incrby(tokensKey, tokens)
    }

    // Set expiry to 30 days for historical data
    await redis.expire(countKey, 30 * 24 * 60 * 60)
    if (tokens !== undefined) {
      await redis.expire(tokensKey, 30 * 24 * 60 * 60)
    }
  } catch (error) {
    // Don't fail the request if tracking fails
    console.error('[QuotaTracker] Failed to track:', error)
  }
}

/**
 * Track AI provider token usage
 */
export async function trackAITokens(
  provider: 'openai' | 'anthropic' | 'google',
  promptTokens: number,
  completionTokens: number
): Promise<void> {
  const totalTokens = promptTokens + completionTokens
  await trackApiCall(`ai:${provider}`, totalTokens)
}

/**
 * Get quota report for a specific date
 */
export async function getDailyQuotaReport(date?: Date): Promise<DailyQuotaReport | null> {
  if (!redis) {
    return null
  }

  const d = date || new Date()
  const dateStr = d.toISOString().split('T')[0]

  const categories: QuotaCategory[] = [
    'ai:openai',
    'ai:anthropic',
    'ai:google',
    'youtube:search',
    'youtube:enrich',
    'credits:consumed',
    'generation:success',
    'generation:failure',
  ]

  try {
    const results: Record<string, QuotaEntry> = {}
    let aiCalls = 0
    let youtubeCalls = 0
    let creditsConsumed = 0
    let generationsSuccess = 0
    let generationsFailure = 0

    for (const category of categories) {
      const key = getQuotaKey(category, d)
      const count = await redis.get<number>(`${key}:count`) || 0
      const tokens = await redis.get<number>(`${key}:tokens`)

      results[category] = {
        count,
        tokens: tokens || undefined,
        lastUpdated: dateStr,
      }

      // Aggregate totals
      if (category.startsWith('ai:')) {
        aiCalls += count
      } else if (category.startsWith('youtube:')) {
        youtubeCalls += count
      } else if (category === 'credits:consumed') {
        creditsConsumed = count
      } else if (category === 'generation:success') {
        generationsSuccess = count
      } else if (category === 'generation:failure') {
        generationsFailure = count
      }
    }

    return {
      date: dateStr,
      categories: results,
      totals: {
        aiCalls,
        youtubeCalls,
        creditsConsumed,
        generationsSuccess,
        generationsFailure,
      },
    }
  } catch (error) {
    console.error('[QuotaTracker] Failed to get report:', error)
    return null
  }
}

/**
 * Get quota reports for the last N days
 */
export async function getQuotaHistory(days: number = 7): Promise<DailyQuotaReport[]> {
  const reports: DailyQuotaReport[] = []
  const now = new Date()

  for (let i = 0; i < days; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const report = await getDailyQuotaReport(date)
    if (report) {
      reports.push(report)
    }
  }

  return reports
}
