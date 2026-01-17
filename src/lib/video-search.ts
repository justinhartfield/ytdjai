/**
 * Unified Video Search Service
 *
 * Tiered approach to finding video data:
 * 1. Check cache first (instant, free)
 * 2. Try Invidious/Piped (free, no quota)
 * 3. Use iTunes for album art (free, high quality)
 * 4. Fall back to YouTube API only as last resort (costs quota)
 *
 * This dramatically reduces YouTube API quota usage.
 */

import { getCachedVideo, cacheVideo, getCachedVideos, cacheVideos, type CachedVideoData } from './video-cache'
import { searchAlternativeSources, type VideoSearchResult } from './invidious-search'
import { searchiTunes, type AlbumArtResult } from './itunes-search'

export interface EnrichedTrackData {
  videoId: string
  thumbnail: string
  duration: number
  source: 'cache' | 'invidious' | 'piped' | 'youtube' | 'itunes'
}

interface SearchOptions {
  /** Skip YouTube API entirely (for generation time) */
  skipYouTube?: boolean
  /** Use iTunes for album art instead of video thumbnails */
  preferAlbumArt?: boolean
  /** Timeout in ms for the entire search */
  timeout?: number
}

/**
 * Search for video data with tiered fallback
 */
export async function searchVideoData(
  artist: string,
  title: string,
  options: SearchOptions = {}
): Promise<EnrichedTrackData | null> {
  const { skipYouTube = false, preferAlbumArt = true } = options
  const query = `${artist} - ${title} official audio`

  console.log(`[VideoSearch] Searching: ${artist} - ${title}`)

  // Step 1: Check cache
  const cached = await getCachedVideo(artist, title)
  if (cached) {
    return {
      videoId: cached.videoId,
      thumbnail: cached.thumbnail,
      duration: cached.duration,
      source: 'cache',
    }
  }

  // Step 2: Try Invidious/Piped (free, no quota)
  const altResult = await searchAlternativeSources(query)

  if (altResult) {
    // Get album art from iTunes if preferred (higher quality)
    let thumbnail = altResult.thumbnail
    let finalSource: EnrichedTrackData['source'] = 'invidious'

    if (preferAlbumArt) {
      const albumArt = await searchiTunes(artist, title)
      if (albumArt?.thumbnail) {
        thumbnail = albumArt.thumbnail
        finalSource = 'itunes'
      }
    }

    // Cache the result
    await cacheVideo(artist, title, {
      videoId: altResult.videoId,
      thumbnail,
      duration: altResult.duration,
      title: altResult.title,
      source: 'invidious',
    })

    return {
      videoId: altResult.videoId,
      thumbnail,
      duration: altResult.duration,
      source: finalSource,
    }
  }

  // Step 3: Skip YouTube if requested (during generation)
  if (skipYouTube) {
    console.log(`[VideoSearch] Skipping YouTube API for: ${artist} - ${title}`)

    // Still try to get album art from iTunes
    if (preferAlbumArt) {
      const albumArt = await searchiTunes(artist, title)
      if (albumArt?.thumbnail) {
        return {
          videoId: '', // No video ID without YouTube
          thumbnail: albumArt.thumbnail,
          duration: albumArt.duration || 240,
          source: 'itunes',
        }
      }
    }

    return null
  }

  // Step 4: Fall back to YouTube API (costs quota - only at export time)
  console.log(`[VideoSearch] Falling back to YouTube API for: ${artist} - ${title}`)
  // Note: YouTube API call is handled by the caller if needed
  // This keeps the YouTube logic separate and allows better quota tracking

  return null
}

/**
 * Batch search for multiple tracks
 * Optimized for bulk operations like playlist generation
 */
export async function batchSearchVideoData(
  tracks: { artist: string; title: string }[],
  options: SearchOptions = {}
): Promise<Map<string, EnrichedTrackData>> {
  const results = new Map<string, EnrichedTrackData>()
  const { preferAlbumArt = true } = options

  if (tracks.length === 0) return results

  console.log(`[VideoSearch] Batch searching ${tracks.length} tracks`)

  // Step 1: Bulk cache lookup
  const cachedResults = await getCachedVideos(tracks)

  const uncachedTracks: { artist: string; title: string }[] = []

  for (const track of tracks) {
    const key = `${track.artist}:${track.title}`
    const cached = cachedResults.get(key)

    if (cached) {
      results.set(key, {
        videoId: cached.videoId,
        thumbnail: cached.thumbnail,
        duration: cached.duration,
        source: 'cache',
      })
    } else {
      uncachedTracks.push(track)
    }
  }

  console.log(`[VideoSearch] ${cachedResults.size} cache hits, ${uncachedTracks.length} need lookup`)

  if (uncachedTracks.length === 0) {
    return results
  }

  // Step 2: Search uncached tracks via Invidious/Piped (parallel, limited concurrency)
  // Reduced concurrency to avoid overwhelming external APIs and prevent timeouts
  const concurrency = 2
  const toCache: { artist: string; title: string; data: Omit<CachedVideoData, 'cachedAt'> }[] = []

  for (let i = 0; i < uncachedTracks.length; i += concurrency) {
    const batch = uncachedTracks.slice(i, i + concurrency)

    const batchResults = await Promise.allSettled(
      batch.map(async (track) => {
        const query = `${track.artist} - ${track.title} official audio`
        const altResult = await searchAlternativeSources(query)

        if (altResult) {
          // Get album art if preferred
          let thumbnail = altResult.thumbnail

          if (preferAlbumArt) {
            const albumArt = await searchiTunes(track.artist, track.title)
            if (albumArt?.thumbnail) {
              thumbnail = albumArt.thumbnail
            }
          }

          return {
            track,
            result: {
              videoId: altResult.videoId,
              thumbnail,
              duration: altResult.duration,
              title: altResult.title,
            },
          }
        }

        // Fallback: Try iTunes for art only (no video ID)
        if (preferAlbumArt) {
          const albumArt = await searchiTunes(track.artist, track.title)
          if (albumArt?.thumbnail) {
            return {
              track,
              result: {
                videoId: '',
                thumbnail: albumArt.thumbnail,
                duration: albumArt.duration || 240,
                title: track.title,
              },
            }
          }
        }

        return { track, result: null }
      })
    )

    for (const settledResult of batchResults) {
      if (settledResult.status === 'fulfilled' && settledResult.value.result) {
        const { track, result } = settledResult.value
        const key = `${track.artist}:${track.title}`

        results.set(key, {
          videoId: result.videoId,
          thumbnail: result.thumbnail,
          duration: result.duration,
          source: result.videoId ? 'invidious' : 'itunes',
        })

        // Queue for caching if we got a video ID
        if (result.videoId) {
          toCache.push({
            artist: track.artist,
            title: track.title,
            data: {
              videoId: result.videoId,
              thumbnail: result.thumbnail,
              duration: result.duration,
              title: result.title,
              source: 'invidious',
            },
          })
        }
      }
    }
  }

  // Step 3: Bulk cache successful results
  if (toCache.length > 0) {
    await cacheVideos(toCache)
  }

  console.log(`[VideoSearch] Batch complete: ${results.size}/${tracks.length} found`)

  return results
}

/**
 * Get enrichment summary for a list of tracks
 */
export function getEnrichmentStats(
  results: Map<string, EnrichedTrackData>
): {
  total: number
  withVideoId: number
  withThumbnail: number
  bySource: Record<string, number>
} {
  let withVideoId = 0
  let withThumbnail = 0
  const bySource: Record<string, number> = {}

  results.forEach((result) => {
    if (result.videoId) withVideoId++
    if (result.thumbnail) withThumbnail++
    bySource[result.source] = (bySource[result.source] || 0) + 1
  })

  return {
    total: results.size,
    withVideoId,
    withThumbnail,
    bySource,
  }
}
