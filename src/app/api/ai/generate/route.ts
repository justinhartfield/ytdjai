import { NextRequest, NextResponse } from 'next/server'
import type { AIProvider, GeneratePlaylistRequest, PlaylistNode, Track } from '@/types'

// YouTube Data API search
interface YouTubeSearchResult {
  videoId: string
  title: string
  thumbnail: string
  channelTitle: string
  duration?: number
}

async function searchYouTube(query: string): Promise<YouTubeSearchResult | null> {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_AI_API_KEY

  if (!apiKey) {
    console.log('No YouTube API key available')
    return null
  }

  try {
    // Search for the video
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?` +
      `part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${apiKey}`
    )

    if (!searchResponse.ok) {
      console.error('YouTube search failed:', searchResponse.status)
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
        // Parse ISO 8601 duration (PT4M33S -> 273 seconds)
        duration = parseISO8601Duration(detailsData.items[0].contentDetails.duration)
      }
    }

    return {
      videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
      channelTitle: item.snippet.channelTitle,
      duration
    }
  } catch (error) {
    console.error('YouTube search error:', error)
    return null
  }
}

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 240 // default 4 min

  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)

  return hours * 3600 + minutes * 60 + seconds
}

async function enrichTracksWithYouTube(tracks: Partial<Track>[]): Promise<Partial<Track>[]> {
  const enrichedTracks = await Promise.all(
    tracks.map(async (track) => {
      const query = `${track.artist} - ${track.title} official audio`
      const result = await searchYouTube(query)

      if (result) {
        return {
          ...track,
          youtubeId: result.videoId,
          thumbnail: result.thumbnail,
          duration: result.duration || track.duration || 240
        }
      }

      return track
    })
  )

  return enrichedTracks
}

// Mock track database
const MOCK_TRACKS: Track[] = [
  {
    id: '1',
    youtubeId: 'dQw4w9WgXcQ',
    title: 'Strobe',
    artist: 'deadmau5',
    duration: 637,
    bpm: 128,
    key: 'F minor',
    genre: 'Progressive House',
    energy: 0.7,
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
  },
  {
    id: '2',
    youtubeId: 'abc123',
    title: 'Opus',
    artist: 'Eric Prydz',
    duration: 540,
    bpm: 126,
    key: 'A minor',
    genre: 'Progressive House',
    energy: 0.8,
    thumbnail: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg'
  },
  {
    id: '3',
    youtubeId: 'def456',
    title: 'Gecko (Overdrive)',
    artist: 'Oliver Heldens',
    duration: 210,
    bpm: 125,
    key: 'G minor',
    genre: 'Future House',
    energy: 0.85,
    thumbnail: 'https://i.ytimg.com/vi/def456/hqdefault.jpg'
  },
  {
    id: '4',
    youtubeId: 'ghi789',
    title: 'Insomnia',
    artist: 'Faithless',
    duration: 420,
    bpm: 130,
    key: 'D minor',
    genre: 'Trance',
    energy: 0.9,
    thumbnail: 'https://i.ytimg.com/vi/ghi789/hqdefault.jpg'
  },
  {
    id: '5',
    youtubeId: 'jkl012',
    title: 'Adagio for Strings',
    artist: 'Tiësto',
    duration: 480,
    bpm: 138,
    key: 'B♭ minor',
    genre: 'Trance',
    energy: 0.95,
    thumbnail: 'https://i.ytimg.com/vi/jkl012/hqdefault.jpg'
  },
  {
    id: '6',
    youtubeId: 'mno345',
    title: 'Ghosts n Stuff',
    artist: 'deadmau5 ft. Rob Swire',
    duration: 360,
    bpm: 127,
    key: 'E minor',
    genre: 'Electro House',
    energy: 0.8,
    thumbnail: 'https://i.ytimg.com/vi/mno345/hqdefault.jpg'
  },
  {
    id: '7',
    youtubeId: 'pqr678',
    title: 'Levels',
    artist: 'Avicii',
    duration: 210,
    bpm: 126,
    key: 'F♯ minor',
    genre: 'Progressive House',
    energy: 0.9,
    thumbnail: 'https://i.ytimg.com/vi/pqr678/hqdefault.jpg'
  },
  {
    id: '8',
    youtubeId: 'stu901',
    title: 'Cafe Del Mar',
    artist: 'Energy 52',
    duration: 450,
    bpm: 132,
    key: 'C minor',
    genre: 'Trance',
    energy: 0.75,
    thumbnail: 'https://i.ytimg.com/vi/stu901/hqdefault.jpg'
  }
]

async function generateWithOpenAI(prompt: string, constraints: GeneratePlaylistRequest['constraints']): Promise<PlaylistNode[]> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    // Return mock data if no API key
    return generateMockPlaylist(constraints?.trackCount || 8)
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a professional DJ and music curator. Generate a playlist based on the user's description.
            Return a JSON array of track objects with: title, artist, bpm, key, genre, energy (0-1), duration (seconds).
            Consider transitions between tracks - adjacent tracks should have compatible BPMs and keys.
            The response should ONLY be valid JSON, no additional text.`
          },
          {
            role: 'user',
            content: `Create a ${constraints?.trackCount || 8} track DJ set: ${prompt}

            BPM range: ${constraints?.bpmRange?.min || 120}-${constraints?.bpmRange?.max || 140}
            Moods: ${constraints?.moods?.join(', ') || 'varied'}
            Exclude artists: ${constraints?.excludeArtists?.join(', ') || 'none'}`
          }
        ],
        temperature: 0.8,
        max_tokens: 2000
      })
    })

    const data = await response.json()

    if (data.choices?.[0]?.message?.content) {
      const tracks = JSON.parse(data.choices[0].message.content)
      return await tracksToPlaylistNodes(tracks)
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
  }

  return generateMockPlaylist(constraints?.trackCount || 8)
}

async function generateWithClaude(prompt: string, constraints: GeneratePlaylistRequest['constraints']): Promise<PlaylistNode[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return generateMockPlaylist(constraints?.trackCount || 8)
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `You are a professional DJ and music curator. Generate a playlist based on this description: "${prompt}"

            Requirements:
            - Track count: ${constraints?.trackCount || 8}
            - BPM range: ${constraints?.bpmRange?.min || 120}-${constraints?.bpmRange?.max || 140}
            - Moods: ${constraints?.moods?.join(', ') || 'varied'}
            - Exclude artists: ${constraints?.excludeArtists?.join(', ') || 'none'}

            Return ONLY a JSON array of track objects with: title, artist, bpm, key, genre, energy (0-1), duration (seconds).
            Consider transitions - adjacent tracks should have compatible BPMs and keys.`
          }
        ]
      })
    })

    const data = await response.json()

    if (data.content?.[0]?.text) {
      // Extract JSON from response
      const jsonMatch = data.content[0].text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const tracks = JSON.parse(jsonMatch[0])
        return await tracksToPlaylistNodes(tracks)
      }
    }
  } catch (error) {
    console.error('Claude API error:', error)
  }

  return generateMockPlaylist(constraints?.trackCount || 8)
}

async function generateWithGemini(prompt: string, constraints: GeneratePlaylistRequest['constraints']): Promise<PlaylistNode[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY

  if (!apiKey) {
    return generateMockPlaylist(constraints?.trackCount || 8)
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a professional DJ and music curator. Generate a playlist based on this description: "${prompt}"

                  Requirements:
                  - Track count: ${constraints?.trackCount || 8}
                  - BPM range: ${constraints?.bpmRange?.min || 120}-${constraints?.bpmRange?.max || 140}
                  - Moods: ${constraints?.moods?.join(', ') || 'varied'}
                  - Exclude artists: ${constraints?.excludeArtists?.join(', ') || 'none'}

                  Return ONLY a JSON array of track objects with: title, artist, bpm, key, genre, energy (0-1), duration (seconds).
                  Consider transitions - adjacent tracks should have compatible BPMs and keys.`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 2000
          }
        })
      }
    )

    const data = await response.json()

    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      const text = data.candidates[0].content.parts[0].text
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const tracks = JSON.parse(jsonMatch[0])
        return await tracksToPlaylistNodes(tracks)
      }
    }
  } catch (error) {
    console.error('Gemini API error:', error)
  }

  return generateMockPlaylist(constraints?.trackCount || 8)
}

async function tracksToPlaylistNodes(tracks: Partial<Track>[]): Promise<PlaylistNode[]> {
  // Enrich tracks with real YouTube data
  const enrichedTracks = await enrichTracksWithYouTube(tracks)

  return enrichedTracks.map((track, index) => ({
    id: `node-${Date.now()}-${index}`,
    track: {
      id: `track-${Date.now()}-${index}`,
      youtubeId: track.youtubeId || `yt-${Date.now()}-${index}`,
      title: track.title || 'Unknown Track',
      artist: track.artist || 'Unknown Artist',
      duration: track.duration || 240,
      bpm: track.bpm,
      key: track.key,
      genre: track.genre,
      energy: track.energy,
      thumbnail: track.thumbnail || `https://picsum.photos/seed/${Date.now() + index}/200/200`
    },
    position: index,
    transitionToNext: index < enrichedTracks.length - 1 ? {
      quality: calculateTransitionQuality(track, enrichedTracks[index + 1]),
      type: 'blend',
      duration: 16
    } : undefined
  }))
}

function calculateTransitionQuality(track1: Partial<Track>, track2: Partial<Track>): 'excellent' | 'good' | 'fair' | 'poor' {
  if (!track1.bpm || !track2.bpm) return 'good'

  const bpmDiff = Math.abs(track1.bpm - track2.bpm)

  if (bpmDiff <= 3) return 'excellent'
  if (bpmDiff <= 6) return 'good'
  if (bpmDiff <= 10) return 'fair'
  return 'poor'
}

function generateMockPlaylist(trackCount: number): PlaylistNode[] {
  const shuffled = [...MOCK_TRACKS].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, Math.min(trackCount, MOCK_TRACKS.length))

  return selected.map((track, index) => ({
    id: `node-${Date.now()}-${index}`,
    track: { ...track, id: `track-${Date.now()}-${index}` },
    position: index,
    transitionToNext: index < selected.length - 1 ? {
      quality: calculateTransitionQuality(track, selected[index + 1]),
      type: 'blend',
      duration: 16
    } : undefined
  }))
}

export async function POST(request: NextRequest) {
  try {
    const body: GeneratePlaylistRequest = await request.json()
    const { prompt, constraints, provider = 'openai' } = body

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      )
    }

    let playlist: PlaylistNode[]

    switch (provider) {
      case 'claude':
        playlist = await generateWithClaude(prompt, constraints)
        break
      case 'gemini':
        playlist = await generateWithGemini(prompt, constraints)
        break
      case 'openai':
      default:
        playlist = await generateWithOpenAI(prompt, constraints)
        break
    }

    return NextResponse.json({
      success: true,
      playlist,
      metadata: {
        provider,
        generatedAt: new Date().toISOString(),
        trackCount: playlist.length,
        totalDuration: playlist.reduce((acc, node) => acc + node.track.duration, 0)
      }
    })
  } catch (error) {
    console.error('Generate playlist error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate playlist' },
      { status: 500 }
    )
  }
}
