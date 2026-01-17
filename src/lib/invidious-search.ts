/**
 * Invidious/Piped Video Search
 *
 * Alternative YouTube frontends that provide free API access without quota limits.
 * Falls back through multiple instances for reliability.
 */

export interface VideoSearchResult {
  videoId: string
  title: string
  thumbnail: string
  duration: number
  channelName?: string
}

// Invidious instances (public, no auth required)
// See: https://api.invidious.io/
const INVIDIOUS_INSTANCES = [
  'https://vid.puffyan.us',
  'https://invidious.nerdvpn.de',
  'https://invidious.privacyredirect.com',
  'https://invidious.protokolla.fi',
  'https://inv.nadeko.net',
]

// Piped instances (alternative)
// See: https://github.com/TeamPiped/Piped/wiki/Instances
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.yt',
]

// Timeout for API calls (reduced to fail faster and avoid serverless function timeout)
const FETCH_TIMEOUT = 3000

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number = FETCH_TIMEOUT
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Search using Invidious API
 */
async function searchInvidious(
  query: string,
  instance: string
): Promise<VideoSearchResult | null> {
  try {
    const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&sort_by=relevance`
    const response = await fetchWithTimeout(url)

    if (!response.ok) {
      console.log(`[Invidious] ${instance} returned ${response.status}`)
      return null
    }

    const data = await response.json()

    if (!Array.isArray(data) || data.length === 0) {
      return null
    }

    // Find the first video result
    const video = data.find((item: { type: string }) => item.type === 'video')
    if (!video) {
      return null
    }

    // Get the best thumbnail
    const thumbnail =
      video.videoThumbnails?.find((t: { quality: string }) => t.quality === 'medium')?.url ||
      video.videoThumbnails?.find((t: { quality: string }) => t.quality === 'high')?.url ||
      video.videoThumbnails?.[0]?.url ||
      `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`

    return {
      videoId: video.videoId,
      title: video.title,
      thumbnail: thumbnail.startsWith('//') ? `https:${thumbnail}` : thumbnail,
      duration: video.lengthSeconds || 240,
      channelName: video.author,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log(`[Invidious] ${instance} timed out`)
    } else {
      console.log(`[Invidious] ${instance} error:`, error)
    }
    return null
  }
}

/**
 * Search using Piped API
 */
async function searchPiped(
  query: string,
  instance: string
): Promise<VideoSearchResult | null> {
  try {
    const url = `${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`
    const response = await fetchWithTimeout(url)

    if (!response.ok) {
      console.log(`[Piped] ${instance} returned ${response.status}`)
      return null
    }

    const data = await response.json()

    if (!data.items || data.items.length === 0) {
      return null
    }

    // Find the first stream (video) result
    const video = data.items.find((item: { type: string }) => item.type === 'stream')
    if (!video) {
      return null
    }

    // Extract video ID from URL
    const videoIdMatch = video.url?.match(/\/watch\?v=([^&]+)/)
    const videoId = videoIdMatch?.[1] || video.url?.split('/').pop()

    if (!videoId) {
      return null
    }

    return {
      videoId,
      title: video.title,
      thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      duration: video.duration || 240,
      channelName: video.uploaderName,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log(`[Piped] ${instance} timed out`)
    } else {
      console.log(`[Piped] ${instance} error:`, error)
    }
    return null
  }
}

/**
 * Search for a video using Invidious instances
 * Try instances in parallel for faster results, return first success
 */
export async function searchWithInvidious(query: string): Promise<VideoSearchResult | null> {
  // Shuffle and take only first 2 instances to limit requests
  const instances = [...INVIDIOUS_INSTANCES].sort(() => Math.random() - 0.5).slice(0, 2)

  // Try instances in parallel, return first successful result
  const results = await Promise.allSettled(
    instances.map(instance => searchInvidious(query, instance))
  )

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      console.log(`[Invidious] Found: ${result.value.videoId}`)
      return result.value
    }
  }

  return null
}

/**
 * Search for a video using Piped instances
 * Try instances in parallel for faster results, return first success
 */
export async function searchWithPiped(query: string): Promise<VideoSearchResult | null> {
  // Shuffle and take only first 2 instances to limit requests
  const instances = [...PIPED_INSTANCES].sort(() => Math.random() - 0.5).slice(0, 2)

  // Try instances in parallel, return first successful result
  const results = await Promise.allSettled(
    instances.map(instance => searchPiped(query, instance))
  )

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      console.log(`[Piped] Found: ${result.value.videoId}`)
      return result.value
    }
  }

  return null
}

/**
 * Search using both Invidious and Piped (parallel, first wins)
 */
export async function searchAlternativeSources(
  query: string
): Promise<VideoSearchResult | null> {
  console.log(`[AltSearch] Searching for: ${query}`)

  // Try both in parallel, return first successful result
  const results = await Promise.allSettled([
    searchWithInvidious(query),
    searchWithPiped(query),
  ])

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      return result.value
    }
  }

  return null
}

/**
 * Get video details by ID (useful for getting duration if we only have the ID)
 */
export async function getVideoDetails(videoId: string): Promise<VideoSearchResult | null> {
  // Try Invidious first
  const instances = [...INVIDIOUS_INSTANCES].sort(() => Math.random() - 0.5)

  for (const instance of instances) {
    try {
      const url = `${instance}/api/v1/videos/${videoId}?fields=videoId,title,videoThumbnails,lengthSeconds,author`
      const response = await fetchWithTimeout(url)

      if (!response.ok) continue

      const video = await response.json()

      const thumbnail =
        video.videoThumbnails?.find((t: { quality: string }) => t.quality === 'medium')?.url ||
        `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`

      return {
        videoId: video.videoId,
        title: video.title,
        thumbnail: thumbnail.startsWith('//') ? `https:${thumbnail}` : thumbnail,
        duration: video.lengthSeconds || 240,
        channelName: video.author,
      }
    } catch {
      continue
    }
  }

  return null
}
