/**
 * Video Search Cache
 *
 * Caches video search results (videoId, thumbnail, duration) to minimize API calls.
 * Uses Upstash Redis for persistent cross-request caching.
 */

import { Redis } from '@upstash/redis'

export interface CachedVideoData {
  videoId: string
  thumbnail: string
  duration: number
  title: string
  source: 'youtube' | 'invidious' | 'piped'
  cachedAt: number
}

// Cache TTL: 30 days (video IDs rarely change)
const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60

// Initialize Redis client
let redis: Redis | null = null
let cacheEnabled = false

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    cacheEnabled = true
  }
} catch (error) {
  console.warn('[VideoCache] Failed to initialize Redis:', error)
}

/**
 * Generate a cache key for a track
 */
function getCacheKey(artist: string, title: string): string {
  // Normalize: lowercase, remove special chars, trim
  const normalizedArtist = artist.toLowerCase().trim().replace(/[^\w\s]/g, '')
  const normalizedTitle = title.toLowerCase().trim().replace(/[^\w\s]/g, '')
  return `video:${normalizedArtist}:${normalizedTitle}`
}

/**
 * Get cached video data for a track
 */
export async function getCachedVideo(
  artist: string,
  title: string
): Promise<CachedVideoData | null> {
  if (!cacheEnabled || !redis) {
    return null
  }

  try {
    const key = getCacheKey(artist, title)
    const cached = await redis.get<CachedVideoData>(key)

    if (cached) {
      console.log(`[VideoCache] HIT: ${artist} - ${title}`)
      return cached
    }

    console.log(`[VideoCache] MISS: ${artist} - ${title}`)
    return null
  } catch (error) {
    console.error('[VideoCache] Error getting cached video:', error)
    return null
  }
}

/**
 * Cache video data for a track
 */
export async function cacheVideo(
  artist: string,
  title: string,
  data: Omit<CachedVideoData, 'cachedAt'>
): Promise<void> {
  if (!cacheEnabled || !redis) {
    return
  }

  try {
    const key = getCacheKey(artist, title)
    const cacheData: CachedVideoData = {
      ...data,
      cachedAt: Date.now(),
    }

    await redis.set(key, cacheData, { ex: CACHE_TTL_SECONDS })
    console.log(`[VideoCache] STORED: ${artist} - ${title} (${data.source})`)
  } catch (error) {
    console.error('[VideoCache] Error caching video:', error)
  }
}

/**
 * Bulk get cached videos for multiple tracks
 */
export async function getCachedVideos(
  tracks: { artist: string; title: string }[]
): Promise<Map<string, CachedVideoData>> {
  const results = new Map<string, CachedVideoData>()

  if (!cacheEnabled || !redis || tracks.length === 0) {
    return results
  }

  try {
    const keys = tracks.map(t => getCacheKey(t.artist, t.title))
    const cached = await redis.mget<(CachedVideoData | null)[]>(...keys)

    let hits = 0
    cached.forEach((data, index) => {
      if (data) {
        const key = `${tracks[index].artist}:${tracks[index].title}`
        results.set(key, data)
        hits++
      }
    })

    console.log(`[VideoCache] Bulk get: ${hits}/${tracks.length} hits`)
  } catch (error) {
    console.error('[VideoCache] Error in bulk get:', error)
  }

  return results
}

/**
 * Bulk cache videos for multiple tracks
 */
export async function cacheVideos(
  videos: { artist: string; title: string; data: Omit<CachedVideoData, 'cachedAt'> }[]
): Promise<void> {
  if (!cacheEnabled || !redis || videos.length === 0) {
    return
  }

  try {
    const pipeline = redis.pipeline()

    for (const { artist, title, data } of videos) {
      const key = getCacheKey(artist, title)
      const cacheData: CachedVideoData = {
        ...data,
        cachedAt: Date.now(),
      }
      pipeline.set(key, cacheData, { ex: CACHE_TTL_SECONDS })
    }

    await pipeline.exec()
    console.log(`[VideoCache] Bulk stored ${videos.length} videos`)
  } catch (error) {
    console.error('[VideoCache] Error in bulk cache:', error)
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  enabled: boolean
  keyCount?: number
}> {
  if (!cacheEnabled || !redis) {
    return { enabled: false }
  }

  try {
    // Count video keys (approximate)
    const info = await redis.dbsize()
    return {
      enabled: true,
      keyCount: info,
    }
  } catch {
    return { enabled: true }
  }
}

/**
 * Check if cache is enabled
 */
export function isCacheEnabled(): boolean {
  return cacheEnabled
}
