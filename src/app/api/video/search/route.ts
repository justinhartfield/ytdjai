/**
 * Video Search API
 *
 * Unified endpoint for searching video data with tiered fallback:
 * 1. Cache → 2. Invidious/Piped → 3. iTunes (art) → 4. YouTube (only if requested)
 *
 * This endpoint is used for:
 * - On-demand track enrichment
 * - Manual "refresh from YouTube" button
 * - Export-time YouTube ID lookup
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchVideoData, batchSearchVideoData } from '@/lib/video-search'
import { rateLimits, checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { checkYouTubeQuota, consumeYouTubeQuota } from '@/lib/youtube-quota'

// YouTube search function (only used when explicitly requested)
async function searchYouTubeAPI(
  artist: string,
  title: string
): Promise<{ videoId: string; thumbnail: string; duration: number } | null> {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_AI_API_KEY

  if (!apiKey) {
    console.error('[YouTube] No API key configured')
    return null
  }

  // Check quota before making the call
  const quotaCheck = await checkYouTubeQuota('search')
  if (!quotaCheck.available) {
    console.warn('[YouTube] Quota exhausted, skipping API call')
    return null
  }

  try {
    const query = `${artist} - ${title} official audio`
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?` +
        `part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${apiKey}`
    )

    if (!searchResponse.ok) {
      if (searchResponse.status === 403) {
        console.error('[YouTube] Quota exceeded (403)')
      }
      return null
    }

    // Consume quota on successful call
    await consumeYouTubeQuota('search')

    const searchData = await searchResponse.json()

    if (!searchData.items?.[0]) {
      return null
    }

    const item = searchData.items[0]
    const videoId = item.id.videoId

    // Get duration
    const detailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?` +
        `part=contentDetails&id=${videoId}&key=${apiKey}`
    )

    let duration = 240
    if (detailsResponse.ok) {
      await consumeYouTubeQuota('videos')
      const detailsData = await detailsResponse.json()
      if (detailsData.items?.[0]?.contentDetails?.duration) {
        duration = parseISO8601Duration(detailsData.items[0].contentDetails.duration)
      }
    }

    return {
      videoId,
      thumbnail:
        item.snippet.thumbnails?.high?.url ||
        item.snippet.thumbnails?.default?.url,
      duration,
    }
  } catch (error) {
    console.error('[YouTube] Search error:', error)
    return null
  }
}

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 240

  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)

  return hours * 3600 + minutes * 60 + seconds
}

/**
 * POST /api/video/search
 *
 * Search for video data for a single track or batch of tracks.
 *
 * Single track:
 * { artist: "Artist", title: "Title", useYouTube?: boolean }
 *
 * Batch:
 * { tracks: [{ artist, title }], useYouTube?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown'

    const rateLimit = await checkRateLimit(rateLimits.youtube, ip)
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          code: 'rate_limited',
          retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimit),
        }
      )
    }

    const body = await request.json()

    // Batch search
    if (body.tracks && Array.isArray(body.tracks)) {
      const tracks = body.tracks as { artist: string; title: string }[]
      const useYouTube = body.useYouTube === true

      console.log(`[VideoSearch API] Batch search: ${tracks.length} tracks, useYouTube: ${useYouTube}`)

      const results = await batchSearchVideoData(tracks, {
        skipYouTube: !useYouTube,
        preferAlbumArt: true,
      })

      // If useYouTube is true, try YouTube for any tracks without videoId
      if (useYouTube) {
        for (const track of tracks) {
          const key = `${track.artist}:${track.title}`
          const existing = results.get(key)

          if (!existing?.videoId) {
            const ytResult = await searchYouTubeAPI(track.artist, track.title)
            if (ytResult) {
              results.set(key, {
                videoId: ytResult.videoId,
                thumbnail: existing?.thumbnail || ytResult.thumbnail,
                duration: ytResult.duration,
                source: 'youtube',
              })
            }
          }
        }
      }

      // Convert Map to array for response
      const enrichedTracks = tracks.map((track) => {
        const key = `${track.artist}:${track.title}`
        const data = results.get(key)
        return {
          artist: track.artist,
          title: track.title,
          ...data,
        }
      })

      // Count tracks with video IDs
      let withVideoIdCount = 0
      results.forEach((r) => {
        if (r.videoId) withVideoIdCount++
      })

      return NextResponse.json({
        success: true,
        tracks: enrichedTracks,
        stats: {
          total: tracks.length,
          found: results.size,
          withVideoId: withVideoIdCount,
        },
      })
    }

    // Single track search
    const { artist, title, useYouTube } = body

    if (!artist || !title) {
      return NextResponse.json(
        { success: false, error: 'artist and title are required' },
        { status: 400 }
      )
    }

    console.log(`[VideoSearch API] Single search: ${artist} - ${title}, useYouTube: ${useYouTube}`)

    // Try tiered search (cache → invidious → itunes)
    let result = await searchVideoData(artist, title, {
      skipYouTube: !useYouTube,
      preferAlbumArt: true,
    })

    // If useYouTube is true and we don't have a video ID, try YouTube API
    if (useYouTube && (!result || !result.videoId)) {
      const ytResult = await searchYouTubeAPI(artist, title)
      if (ytResult) {
        result = {
          videoId: ytResult.videoId,
          thumbnail: result?.thumbnail || ytResult.thumbnail,
          duration: ytResult.duration,
          source: 'youtube',
        }
      }
    }

    if (!result) {
      return NextResponse.json({
        success: true,
        videoId: '',
        thumbnail: `https://picsum.photos/seed/${Date.now()}/200/200`,
        duration: 240,
        source: 'placeholder',
      })
    }

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[VideoSearch API] Error:', errorMessage)
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
