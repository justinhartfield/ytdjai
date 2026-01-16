/**
 * iTunes Search API
 *
 * Free API for getting high-quality album artwork and track metadata.
 * No API key required, generous rate limits.
 */

export interface iTunesTrackResult {
  trackId: number
  trackName: string
  artistName: string
  collectionName: string // album name
  artworkUrl60: string
  artworkUrl100: string
  artworkUrl600?: string // Derived from artworkUrl100
  trackTimeMillis: number
  primaryGenreName: string
  previewUrl?: string
}

export interface AlbumArtResult {
  thumbnail: string // High-res album art URL
  thumbnailSmall: string // Medium-res for list views
  album?: string
  genre?: string
  duration?: number // in seconds
}

// Timeout for API calls
const FETCH_TIMEOUT = 4000

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
 * Search iTunes for a track and get album artwork
 */
export async function searchiTunes(
  artist: string,
  title: string
): Promise<AlbumArtResult | null> {
  try {
    // Build search query
    const query = `${artist} ${title}`.trim()
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=5`

    console.log(`[iTunes] Searching: ${query}`)
    const response = await fetchWithTimeout(url)

    if (!response.ok) {
      console.log(`[iTunes] API returned ${response.status}`)
      return null
    }

    const data = await response.json()

    if (!data.results || data.results.length === 0) {
      console.log(`[iTunes] No results for: ${query}`)
      return null
    }

    // Find best match - prefer exact artist match
    const normalizedArtist = artist.toLowerCase().trim()
    const normalizedTitle = title.toLowerCase().trim()

    let bestMatch: iTunesTrackResult | null = null

    for (const result of data.results) {
      const resultArtist = result.artistName?.toLowerCase() || ''
      const resultTitle = result.trackName?.toLowerCase() || ''

      // Check for artist match
      if (
        resultArtist.includes(normalizedArtist) ||
        normalizedArtist.includes(resultArtist)
      ) {
        // Check for title match
        if (
          resultTitle.includes(normalizedTitle) ||
          normalizedTitle.includes(resultTitle)
        ) {
          bestMatch = result
          break
        }
      }
    }

    // Fall back to first result if no good match
    const match = bestMatch || data.results[0]

    if (!match) {
      return null
    }

    // Get high-res artwork by replacing size in URL
    // iTunes provides artworkUrl100 which is 100x100, we can request up to 600x600
    const artworkUrl600 = match.artworkUrl100?.replace('100x100', '600x600')
    const artworkUrl200 = match.artworkUrl100?.replace('100x100', '200x200')

    console.log(`[iTunes] Found: ${match.artistName} - ${match.trackName}`)

    return {
      thumbnail: artworkUrl600 || artworkUrl200 || match.artworkUrl100,
      thumbnailSmall: artworkUrl200 || match.artworkUrl100,
      album: match.collectionName,
      genre: match.primaryGenreName,
      duration: match.trackTimeMillis
        ? Math.round(match.trackTimeMillis / 1000)
        : undefined,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log(`[iTunes] Search timed out for: ${artist} - ${title}`)
    } else {
      console.error(`[iTunes] Error:`, error)
    }
    return null
  }
}

/**
 * Batch search iTunes for multiple tracks
 * Note: iTunes doesn't have a batch API, so we make parallel requests with rate limiting
 */
export async function batchiTunesSearch(
  tracks: { artist: string; title: string }[],
  concurrency: number = 5
): Promise<Map<string, AlbumArtResult>> {
  const results = new Map<string, AlbumArtResult>()

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < tracks.length; i += concurrency) {
    const batch = tracks.slice(i, i + concurrency)

    const batchResults = await Promise.allSettled(
      batch.map(async (track) => {
        const result = await searchiTunes(track.artist, track.title)
        return { track, result }
      })
    )

    for (const settledResult of batchResults) {
      if (settledResult.status === 'fulfilled' && settledResult.value.result) {
        const { track, result } = settledResult.value
        const key = `${track.artist}:${track.title}`
        results.set(key, result)
      }
    }

    // Small delay between batches to be nice to the API
    if (i + concurrency < tracks.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  console.log(`[iTunes] Batch search: ${results.size}/${tracks.length} found`)
  return results
}
