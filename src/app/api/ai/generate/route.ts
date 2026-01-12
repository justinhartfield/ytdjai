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

async function generateWithOpenAI(prompt: string, constraints: GeneratePlaylistRequest['constraints']): Promise<PlaylistNode[]> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.error('[OpenAI] No API key configured')
    throw new Error('OpenAI API key not configured')
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
            Return a JSON array of track objects with these fields:
            - title: string (track name)
            - artist: string (artist name)
            - bpm: number (beats per minute, typically 80-180)
            - key: string (musical key like "Am", "F#m", "C")
            - genre: string (music genre)
            - energy: number (0-1 scale)
            - duration: number (in seconds, typically 180-420)
            - aiReasoning: string (1-2 sentences explaining why this track fits the set and transitions well)

            Consider transitions between tracks - adjacent tracks should have compatible BPMs and keys.
            The response should ONLY be valid JSON array, no additional text or markdown.`
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
      const content = data.choices[0].message.content
      console.log('[OpenAI] Raw response:', content.substring(0, 200))
      const tracks = JSON.parse(content)
      console.log('[OpenAI] Parsed', tracks.length, 'tracks')
      return await tracksToPlaylistNodes(tracks)
    }

    console.error('[OpenAI] No valid response content:', data)
    throw new Error('OpenAI returned no valid content')
  } catch (error) {
    console.error('[OpenAI] API error:', error)
    throw error
  }
}

async function generateWithClaude(prompt: string, constraints: GeneratePlaylistRequest['constraints']): Promise<PlaylistNode[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    console.error('[Claude] No API key configured')
    throw new Error('Anthropic API key not configured')
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

            Return ONLY a JSON array of track objects with these fields:
            - title: string (track name)
            - artist: string (artist name)
            - bpm: number (beats per minute)
            - key: string (musical key like "Am", "F#m", "C")
            - genre: string (music genre)
            - energy: number (0-1 scale)
            - duration: number (in seconds)
            - aiReasoning: string (1-2 sentences explaining why this track fits the set and transitions well)

            Consider transitions - adjacent tracks should have compatible BPMs and keys.`
          }
        ]
      })
    })

    const data = await response.json()

    if (data.content?.[0]?.text) {
      // Extract JSON from response
      const text = data.content[0].text
      console.log('[Claude] Raw response:', text.substring(0, 200))
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const tracks = JSON.parse(jsonMatch[0])
        console.log('[Claude] Parsed', tracks.length, 'tracks')
        return await tracksToPlaylistNodes(tracks)
      }
    }

    console.error('[Claude] No valid response content:', data)
    throw new Error('Claude returned no valid content')
  } catch (error) {
    console.error('[Claude] API error:', error)
    throw error
  }
}

async function generateWithGemini(prompt: string, constraints: GeneratePlaylistRequest['constraints']): Promise<PlaylistNode[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY

  if (!apiKey) {
    console.error('[Gemini] No API key configured')
    throw new Error('Google AI API key not configured')
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

                  Return ONLY a JSON array of track objects with these fields:
                  - title: string (track name)
                  - artist: string (artist name)
                  - bpm: number (beats per minute)
                  - key: string (musical key like "Am", "F#m", "C")
                  - genre: string (music genre)
                  - energy: number (0-1 scale)
                  - duration: number (in seconds)
                  - aiReasoning: string (1-2 sentences explaining why this track fits the set and transitions well)

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
      console.log('[Gemini] Raw response:', text.substring(0, 200))
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const tracks = JSON.parse(jsonMatch[0])
        console.log('[Gemini] Parsed', tracks.length, 'tracks')
        return await tracksToPlaylistNodes(tracks)
      }
    }

    console.error('[Gemini] No valid response content:', data)
    throw new Error('Gemini returned no valid content')
  } catch (error) {
    console.error('[Gemini] API error:', error)
    throw error
  }
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
      thumbnail: track.thumbnail || `https://picsum.photos/seed/${Date.now() + index}/200/200`,
      aiReasoning: track.aiReasoning
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

export async function POST(request: NextRequest) {
  try {
    const body: GeneratePlaylistRequest = await request.json()
    const { prompt, constraints, provider = 'openai' } = body

    console.log('[Generate API] Request received:', { provider, prompt: prompt?.substring(0, 50) })
    console.log('[Generate API] API Keys present:', {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      google: !!process.env.GOOGLE_AI_API_KEY,
      youtube: !!process.env.YOUTUBE_API_KEY
    })

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

    console.log('[Generate API] Generated', playlist.length, 'tracks')
    console.log('[Generate API] First track:', playlist[0]?.track.title, '-', playlist[0]?.track.artist)

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Generate API] Error:', errorMessage)
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
