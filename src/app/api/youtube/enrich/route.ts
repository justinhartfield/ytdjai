import { NextRequest, NextResponse } from 'next/server'

interface YouTubeSearchResult {
  videoId: string
  title: string
  thumbnail: string
  duration?: number
}

async function searchYouTube(query: string, apiKey: string): Promise<YouTubeSearchResult | null> {
  try {
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?` +
      `part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${apiKey}`
    )

    if (!searchResponse.ok) {
      console.error('[YouTube Enrich] Search failed:', searchResponse.status)
      return null
    }

    const searchData = await searchResponse.json()

    if (!searchData.items?.[0]) {
      return null
    }

    const item = searchData.items[0]
    const videoId = item.id.videoId

    // Get video details for duration
    const detailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?` +
      `part=contentDetails&id=${videoId}&key=${apiKey}`
    )

    let duration: number | undefined
    if (detailsResponse.ok) {
      const detailsData = await detailsResponse.json()
      if (detailsData.items?.[0]?.contentDetails?.duration) {
        duration = parseISO8601Duration(detailsData.items[0].contentDetails.duration)
      }
    }

    return {
      videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      duration
    }
  } catch (error) {
    console.error('[YouTube Enrich] Error:', error)
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { artist, title } = body

    if (!artist || !title) {
      return NextResponse.json(
        { success: false, error: 'Artist and title are required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_AI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'YouTube API key not configured' },
        { status: 500 }
      )
    }

    const query = `${artist} - ${title} official audio`
    console.log('[YouTube Enrich] Searching for:', query)

    const result = await searchYouTube(query, apiKey)

    if (!result) {
      return NextResponse.json({
        success: true,
        youtubeId: '',
        thumbnail: `https://picsum.photos/seed/${Date.now()}/200/200`,
        duration: 240
      })
    }

    console.log('[YouTube Enrich] Found:', result.videoId)

    return NextResponse.json({
      success: true,
      youtubeId: result.videoId,
      thumbnail: result.thumbnail,
      duration: result.duration || 240
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[YouTube Enrich] Error:', errorMessage)
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
