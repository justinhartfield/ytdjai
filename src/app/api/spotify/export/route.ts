/**
 * Spotify Playlist Export API
 *
 * Creates a playlist on Spotify from the user's generated tracks.
 * Uses the Spotify Web API to:
 * 1. Search for tracks by artist/title
 * 2. Create a new playlist
 * 3. Add found tracks to the playlist
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface ExportRequest {
  name: string
  description: string
  visibility: 'public' | 'private'
  tracks: { title: string; artist: string }[]
}

interface SpotifyTrack {
  uri: string
  name: string
  artists: { name: string }[]
}

/**
 * Search Spotify for a track
 */
async function searchSpotifyTrack(
  accessToken: string,
  artist: string,
  title: string
): Promise<SpotifyTrack | null> {
  try {
    const query = encodeURIComponent(`track:${title} artist:${artist}`)
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      console.error(`[Spotify] Search failed for "${artist} - ${title}":`, response.status)
      return null
    }

    const data = await response.json()

    if (data.tracks?.items?.length > 0) {
      return data.tracks.items[0]
    }

    // Try a broader search if exact match fails
    const broadQuery = encodeURIComponent(`${artist} ${title}`)
    const broadResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${broadQuery}&type=track&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (broadResponse.ok) {
      const broadData = await broadResponse.json()
      if (broadData.tracks?.items?.length > 0) {
        return broadData.tracks.items[0]
      }
    }

    return null
  } catch (error) {
    console.error(`[Spotify] Search error for "${artist} - ${title}":`, error)
    return null
  }
}

/**
 * Get Spotify user ID
 */
async function getSpotifyUserId(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      console.error('[Spotify] Failed to get user:', response.status)
      return null
    }

    const data = await response.json()
    return data.id
  } catch (error) {
    console.error('[Spotify] Error getting user:', error)
    return null
  }
}

/**
 * Create a Spotify playlist
 */
async function createSpotifyPlaylist(
  accessToken: string,
  userId: string,
  name: string,
  description: string,
  isPublic: boolean
): Promise<{ id: string; url: string } | null> {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          public: isPublic,
        }),
      }
    )

    if (!response.ok) {
      console.error('[Spotify] Failed to create playlist:', response.status)
      const error = await response.json()
      console.error('[Spotify] Error:', error)
      return null
    }

    const data = await response.json()
    return {
      id: data.id,
      url: data.external_urls?.spotify || `https://open.spotify.com/playlist/${data.id}`,
    }
  } catch (error) {
    console.error('[Spotify] Error creating playlist:', error)
    return null
  }
}

/**
 * Add tracks to a Spotify playlist
 */
async function addTracksToPlaylist(
  accessToken: string,
  playlistId: string,
  trackUris: string[]
): Promise<boolean> {
  if (trackUris.length === 0) return true

  try {
    // Spotify allows max 100 tracks per request
    const batchSize = 100
    for (let i = 0; i < trackUris.length; i += batchSize) {
      const batch = trackUris.slice(i, i + batchSize)

      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uris: batch,
          }),
        }
      )

      if (!response.ok) {
        console.error('[Spotify] Failed to add tracks:', response.status)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('[Spotify] Error adding tracks:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get session and verify Spotify access
    const session = await getServerSession(authOptions)

    if (!session?.spotifyAccessToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated with Spotify' },
        { status: 401 }
      )
    }

    const accessToken = session.spotifyAccessToken

    // Parse request body
    const body: ExportRequest = await request.json()
    const { name, description, visibility, tracks } = body

    if (!name || !tracks || tracks.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name and tracks are required' },
        { status: 400 }
      )
    }

    console.log(`[Spotify Export] Starting export: ${name} with ${tracks.length} tracks`)

    // Get user ID
    const userId = await getSpotifyUserId(accessToken)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Failed to get Spotify user' },
        { status: 500 }
      )
    }

    // Search for all tracks
    console.log('[Spotify Export] Searching for tracks...')
    const trackUris: string[] = []
    const foundTracks: string[] = []
    const notFoundTracks: string[] = []

    for (const track of tracks) {
      const spotifyTrack = await searchSpotifyTrack(accessToken, track.artist, track.title)
      if (spotifyTrack) {
        trackUris.push(spotifyTrack.uri)
        foundTracks.push(`${track.artist} - ${track.title}`)
      } else {
        notFoundTracks.push(`${track.artist} - ${track.title}`)
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 50))
    }

    console.log(`[Spotify Export] Found ${trackUris.length}/${tracks.length} tracks`)

    if (trackUris.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No tracks found on Spotify' },
        { status: 404 }
      )
    }

    // Create playlist
    console.log('[Spotify Export] Creating playlist...')
    const playlist = await createSpotifyPlaylist(
      accessToken,
      userId,
      name,
      description,
      visibility === 'public'
    )

    if (!playlist) {
      return NextResponse.json(
        { success: false, error: 'Failed to create Spotify playlist' },
        { status: 500 }
      )
    }

    // Add tracks to playlist
    console.log('[Spotify Export] Adding tracks...')
    const added = await addTracksToPlaylist(accessToken, playlist.id, trackUris)

    if (!added) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to add tracks to playlist',
          playlistUrl: playlist.url,
        },
        { status: 500 }
      )
    }

    console.log(`[Spotify Export] Success! Playlist: ${playlist.url}`)

    return NextResponse.json({
      success: true,
      playlistUrl: playlist.url,
      playlistId: playlist.id,
      results: {
        added: trackUris.length,
        failed: notFoundTracks.length,
        notFound: notFoundTracks,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Spotify Export] Error:', errorMessage)
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
