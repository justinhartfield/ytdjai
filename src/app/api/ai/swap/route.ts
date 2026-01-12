import { NextRequest, NextResponse } from 'next/server'
import type { AIProvider, SwapTrackRequest, Track } from '@/types'

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
    console.log('[Swap API] No YouTube API key available')
    return null
  }

  try {
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?` +
      `part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${apiKey}`
    )

    if (!searchResponse.ok) {
      console.error('[Swap API] YouTube search failed:', searchResponse.status)
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
      channelTitle: item.snippet.channelTitle,
      duration
    }
  } catch (error) {
    console.error('[Swap API] YouTube search error:', error)
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

async function suggestTrackWithOpenAI(
  targetBpm: number,
  genre: string,
  mood: string,
  excludeArtists: string[]
): Promise<Partial<Track> | null> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.error('[Swap API] No OpenAI API key configured')
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
            content: `You are a professional DJ suggesting a single track for a DJ set.
            Return ONLY valid JSON with these fields:
            - title: string (track name)
            - artist: string (artist name)
            - bpm: number (must be within ±3 of the target BPM)
            - key: string (musical key)
            - genre: string
            - energy: number (0-1)
            - aiReasoning: string (why this track fits)

            No markdown, no explanation, just the JSON object.`
          },
          {
            role: 'user',
            content: `Suggest ONE track at approximately ${targetBpm} BPM.
            Style: ${genre || 'electronic dance music'}
            Mood: ${mood || 'energetic'}
            ${excludeArtists.length > 0 ? `Exclude these artists: ${excludeArtists.join(', ')}` : ''}

            Return only the JSON object.`
          }
        ],
        temperature: 0.9,
        max_tokens: 500
      })
    })

    const data = await response.json()

    if (data.choices?.[0]?.message?.content) {
      const content = data.choices[0].message.content.trim()
      // Try to parse JSON, handling potential markdown wrapping
      let jsonStr = content
      if (content.includes('```')) {
        const match = content.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (match) jsonStr = match[1].trim()
      }
      const track = JSON.parse(jsonStr)
      console.log('[Swap API] OpenAI suggested:', track.artist, '-', track.title)
      return track
    }

    return null
  } catch (error) {
    console.error('[Swap API] OpenAI error:', error)
    throw error
  }
}

async function suggestTrackWithClaude(
  targetBpm: number,
  genre: string,
  mood: string,
  excludeArtists: string[]
): Promise<Partial<Track> | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    console.error('[Swap API] No Anthropic API key configured')
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
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `You are a professional DJ. Suggest ONE track at approximately ${targetBpm} BPM.
            Style: ${genre || 'electronic dance music'}
            Mood: ${mood || 'energetic'}
            ${excludeArtists.length > 0 ? `Exclude these artists: ${excludeArtists.join(', ')}` : ''}

            Return ONLY a JSON object with these fields:
            - title: string (track name)
            - artist: string (artist name)
            - bpm: number (must be within ±3 of ${targetBpm})
            - key: string (musical key)
            - genre: string
            - energy: number (0-1)
            - aiReasoning: string (why this track fits)

            No markdown, no explanation, just the JSON object.`
          }
        ]
      })
    })

    const data = await response.json()

    if (data.content?.[0]?.text) {
      const content = data.content[0].text.trim()
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const track = JSON.parse(jsonMatch[0])
        console.log('[Swap API] Claude suggested:', track.artist, '-', track.title)
        return track
      }
    }

    return null
  } catch (error) {
    console.error('[Swap API] Claude error:', error)
    throw error
  }
}

async function suggestTrackWithGemini(
  targetBpm: number,
  genre: string,
  mood: string,
  excludeArtists: string[]
): Promise<Partial<Track> | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY

  if (!apiKey) {
    console.error('[Swap API] No Google AI API key configured')
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
                  text: `You are a professional DJ. Suggest ONE track at approximately ${targetBpm} BPM.
                  Style: ${genre || 'electronic dance music'}
                  Mood: ${mood || 'energetic'}
                  ${excludeArtists.length > 0 ? `Exclude these artists: ${excludeArtists.join(', ')}` : ''}

                  Return ONLY a JSON object with these fields:
                  - title: string (track name)
                  - artist: string (artist name)
                  - bpm: number (must be within ±3 of ${targetBpm})
                  - key: string (musical key)
                  - genre: string
                  - energy: number (0-1)
                  - aiReasoning: string (why this track fits)

                  No markdown, no explanation, just the JSON object.`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 500
          }
        })
      }
    )

    const data = await response.json()

    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      const content = data.candidates[0].content.parts[0].text.trim()
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const track = JSON.parse(jsonMatch[0])
        console.log('[Swap API] Gemini suggested:', track.artist, '-', track.title)
        return track
      }
    }

    return null
  } catch (error) {
    console.error('[Swap API] Gemini error:', error)
    throw error
  }
}

async function enrichTrackWithYouTube(track: Partial<Track>): Promise<Track> {
  const query = `${track.artist} - ${track.title} official audio`
  const result = await searchYouTube(query)

  return {
    id: `track-${Date.now()}`,
    youtubeId: result?.videoId || `yt-${Date.now()}`,
    title: track.title || 'Unknown Track',
    artist: track.artist || 'Unknown Artist',
    duration: result?.duration || track.duration || 240,
    bpm: track.bpm,
    key: track.key,
    genre: track.genre,
    energy: track.energy,
    thumbnail: result?.thumbnail || `https://picsum.photos/seed/${Date.now()}/200/200`,
    aiReasoning: track.aiReasoning
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SwapTrackRequest = await request.json()
    const {
      currentTrack,
      previousTrack,
      nextTrack,
      targetBpm,
      constraints,
      provider = 'openai'
    } = body

    console.log('[Swap API] Request received:', {
      provider,
      targetBpm,
      currentTrack: currentTrack?.title,
      currentBpm: currentTrack?.bpm
    })

    if (!currentTrack) {
      return NextResponse.json(
        { success: false, error: 'Current track is required' },
        { status: 400 }
      )
    }

    // Calculate target BPM if not provided
    let finalTargetBpm = targetBpm
    if (!finalTargetBpm) {
      if (previousTrack?.bpm && nextTrack?.bpm) {
        finalTargetBpm = Math.round((previousTrack.bpm + nextTrack.bpm) / 2)
      } else if (previousTrack?.bpm) {
        finalTargetBpm = previousTrack.bpm + 2
      } else if (nextTrack?.bpm) {
        finalTargetBpm = nextTrack.bpm - 2
      } else {
        finalTargetBpm = currentTrack.bpm || 128
      }
    }

    const genre = currentTrack.genre || 'electronic dance music'
    const mood = currentTrack.energy && currentTrack.energy > 0.7 ? 'high energy' : 'groovy'
    const excludeArtists = [currentTrack.artist, previousTrack?.artist, nextTrack?.artist].filter(Boolean) as string[]

    console.log('[Swap API] Searching for track at', finalTargetBpm, 'BPM, genre:', genre)

    let suggestedTrack: Partial<Track> | null = null

    switch (provider) {
      case 'claude':
        suggestedTrack = await suggestTrackWithClaude(finalTargetBpm, genre, mood, excludeArtists)
        break
      case 'gemini':
        suggestedTrack = await suggestTrackWithGemini(finalTargetBpm, genre, mood, excludeArtists)
        break
      case 'openai':
      default:
        suggestedTrack = await suggestTrackWithOpenAI(finalTargetBpm, genre, mood, excludeArtists)
        break
    }

    if (!suggestedTrack) {
      throw new Error('AI failed to suggest a track')
    }

    // Enrich with YouTube data
    const newTrack = await enrichTrackWithYouTube(suggestedTrack)

    // Calculate transition quality
    let transitionQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'good'
    if (previousTrack?.bpm && newTrack.bpm) {
      const bpmDiff = Math.abs(previousTrack.bpm - newTrack.bpm)
      if (bpmDiff <= 3) transitionQuality = 'excellent'
      else if (bpmDiff <= 6) transitionQuality = 'good'
      else if (bpmDiff <= 10) transitionQuality = 'fair'
      else transitionQuality = 'poor'
    }

    console.log('[Swap API] Returning track:', newTrack.artist, '-', newTrack.title, 'at', newTrack.bpm, 'BPM')

    return NextResponse.json({
      success: true,
      newTrack,
      transitionQuality,
      reasoning: newTrack.aiReasoning || `Selected "${newTrack.title}" by ${newTrack.artist} (${newTrack.bpm} BPM) as an alternative that maintains flow with surrounding tracks.`,
      metadata: {
        provider,
        targetBpm: finalTargetBpm,
        generatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Swap API] Error:', errorMessage)
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
