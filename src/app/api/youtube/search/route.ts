import { NextRequest, NextResponse } from 'next/server'

interface YouTubeSearchResult {
  videoId: string
  title: string
  artist: string
  thumbnail: string
  channelTitle: string
}

// Parse video title to extract artist and song title
function parseVideoTitle(title: string, channelTitle: string): { artist: string; songTitle: string } {
  // Common patterns: "Artist - Song", "Artist | Song", "Artist: Song"
  const separators = [' - ', ' – ', ' — ', ' | ', ': ']

  for (const sep of separators) {
    if (title.includes(sep)) {
      const parts = title.split(sep)
      if (parts.length >= 2) {
        // Clean up common suffixes like "(Official Video)", "[Lyrics]", etc.
        const songTitle = parts.slice(1).join(sep)
          .replace(/\s*[\(\[].*?[\)\]]\s*/g, '')
          .replace(/\s*(official|video|audio|lyrics|hd|4k|music)\s*/gi, '')
          .trim()
        return {
          artist: parts[0].trim(),
          songTitle: songTitle || parts.slice(1).join(sep).trim()
        }
      }
    }
  }

  // Fallback: use channel as artist, full title as song
  const cleanTitle = title
    .replace(/\s*[\(\[].*?[\)\]]\s*/g, '')
    .replace(/\s*(official|video|audio|lyrics|hd|4k|music)\s*/gi, '')
    .trim()

  return {
    artist: channelTitle.replace(/\s*(VEVO|Official|Music|Records)\s*/gi, '').trim(),
    songTitle: cleanTitle || title
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 10)

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ success: true, results: [] })
    }

    const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_AI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'YouTube API key not configured' },
        { status: 500 }
      )
    }

    // Search for music videos
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?` +
      `part=snippet&type=video&videoCategoryId=10&maxResults=${limit}` +
      `&q=${encodeURIComponent(query + ' song')}&key=${apiKey}`,
      { next: { revalidate: 60 } } // Cache for 1 minute
    )

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error('[YouTube Search] API error:', searchResponse.status, errorText)

      if (searchResponse.status === 403) {
        return NextResponse.json(
          { success: false, error: 'YouTube API quota exceeded' },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { success: false, error: 'YouTube search failed' },
        { status: searchResponse.status }
      )
    }

    const data = await searchResponse.json()

    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ success: true, results: [] })
    }

    const results: YouTubeSearchResult[] = data.items.map((item: {
      id: { videoId: string }
      snippet: {
        title: string
        channelTitle: string
        thumbnails: {
          high?: { url: string }
          medium?: { url: string }
          default?: { url: string }
        }
      }
    }) => {
      const { artist, songTitle } = parseVideoTitle(item.snippet.title, item.snippet.channelTitle)

      return {
        videoId: item.id.videoId,
        title: songTitle,
        artist: artist,
        thumbnail: item.snippet.thumbnails?.high?.url ||
                   item.snippet.thumbnails?.medium?.url ||
                   item.snippet.thumbnails?.default?.url || '',
        channelTitle: item.snippet.channelTitle
      }
    })

    return NextResponse.json({ success: true, results })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[YouTube Search] Error:', errorMessage)
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
