import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface ExportRequest {
  name: string
  description: string
  visibility: 'public' | 'unlisted' | 'private'
  tracks: Array<{
    youtubeId: string
    title: string
    artist: string
  }>
}

interface YouTubePlaylistResponse {
  id: string
  snippet: {
    title: string
    description: string
  }
}

interface YouTubePlaylistItemResponse {
  id: string
  snippet: {
    resourceId: {
      videoId: string
    }
  }
}

// Create a new YouTube playlist
async function createPlaylist(
  accessToken: string,
  name: string,
  description: string,
  visibility: string
): Promise<YouTubePlaylistResponse> {
  const response = await fetch(
    'https://www.googleapis.com/youtube/v3/playlists?part=snippet,status',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          title: name,
          description: description,
        },
        status: {
          privacyStatus: visibility,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    console.error('[YouTube API] Create playlist error:', error)
    throw new Error(error.error?.message || 'Failed to create playlist')
  }

  return response.json()
}

// Add a video to a playlist
async function addVideoToPlaylist(
  accessToken: string,
  playlistId: string,
  videoId: string
): Promise<YouTubePlaylistItemResponse> {
  const response = await fetch(
    'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          playlistId: playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId: videoId,
          },
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    // Don't fail the whole export if one video fails (might be unavailable)
    console.error(`[YouTube API] Add video ${videoId} error:`, error)
    throw new Error(error.error?.message || 'Failed to add video')
  }

  return response.json()
}

export async function POST(request: NextRequest) {
  try {
    // Get session with access token
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated. Please sign in with Google.' },
        { status: 401 }
      )
    }

    const body: ExportRequest = await request.json()
    const { name, description, visibility, tracks } = body

    if (!name || !tracks?.length) {
      return NextResponse.json(
        { success: false, error: 'Name and tracks are required' },
        { status: 400 }
      )
    }

    console.log(`[YouTube Export] Creating playlist "${name}" with ${tracks.length} tracks`)

    // Create the playlist
    const playlist = await createPlaylist(
      session.accessToken,
      name,
      description,
      visibility
    )

    console.log(`[YouTube Export] Created playlist: ${playlist.id}`)

    // Add tracks to the playlist
    const results = {
      added: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const track of tracks) {
      try {
        await addVideoToPlaylist(session.accessToken, playlist.id, track.youtubeId)
        results.added++
        console.log(`[YouTube Export] Added: ${track.title}`)
      } catch (error) {
        results.failed++
        results.errors.push(`${track.title}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        console.error(`[YouTube Export] Failed to add: ${track.title}`)
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    const playlistUrl = `https://www.youtube.com/playlist?list=${playlist.id}`

    console.log(`[YouTube Export] Complete: ${results.added}/${tracks.length} tracks added`)

    return NextResponse.json({
      success: true,
      playlistId: playlist.id,
      playlistUrl,
      results,
    })
  } catch (error) {
    console.error('[YouTube Export] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      },
      { status: 500 }
    )
  }
}
