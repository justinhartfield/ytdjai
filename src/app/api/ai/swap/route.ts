import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkCanGenerate, consumeCredit, getUserSubscription } from '@/lib/subscription'
import { TIER_CONFIG } from '@/lib/stripe'
import type { AIProvider, SwapTrackRequest, Track } from '@/types'

// Next.js route segment config - increase timeout for serverless functions
export const maxDuration = 60

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
  targetEnergy: number,
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
            - key: string (musical key)
            - genre: string
            - energy: number (1-100 subjective intensity scale, NOT tempo)
              1-20: Ambient/chill
              21-40: Relaxed, groovy
              41-60: Moderate, steady
              61-80: High energy, driving
              81-100: Peak intensity
              Based on: aggression, rhythmic intensity, emotional intensity, builds/drops
            - aiReasoning: string (IMPORTANT: explain how this track fits the set's style/mood AND how it transitions well from surrounding tracks. Reference the genre/mood directly.)

            No markdown, no explanation, just the JSON object.`
          },
          {
            role: 'user',
            content: `Suggest ONE track with energy around ${targetEnergy} (1-100 scale).
            Style: ${genre || 'electronic dance music'}
            Mood: ${mood || 'energetic'}
            ${excludeArtists.length > 0 ? `Exclude these artists: ${excludeArtists.join(', ')}` : ''}

            The aiReasoning should explain why this track fits the "${genre}" style and "${mood}" mood.

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
  targetEnergy: number,
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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `You are a professional DJ. Suggest ONE track with energy around ${targetEnergy} (1-100 scale).
            Style: ${genre || 'electronic dance music'}
            Mood: ${mood || 'energetic'}
            ${excludeArtists.length > 0 ? `Exclude these artists: ${excludeArtists.join(', ')}` : ''}

            Return ONLY a JSON object with these fields:
            - title: string (track name)
            - artist: string (artist name)
            - key: string (musical key)
            - genre: string
            - energy: number (1-100 subjective intensity scale - NOT tempo)
              1-20: Ambient/chill, 21-40: Relaxed, 41-60: Moderate, 61-80: High energy, 81-100: Peak intensity
            - aiReasoning: string (IMPORTANT: explain how this track fits the "${genre}" style and "${mood}" mood, and how it transitions well from surrounding tracks)

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
  targetEnergy: number,
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
                  text: `You are a professional DJ. Suggest ONE track with energy around ${targetEnergy} (1-100 scale).
                  Style: ${genre || 'electronic dance music'}
                  Mood: ${mood || 'energetic'}
                  ${excludeArtists.length > 0 ? `Exclude these artists: ${excludeArtists.join(', ')}` : ''}

                  Return ONLY a JSON object with these fields:
                  - title: string (track name)
                  - artist: string (artist name)
                  - key: string (musical key)
                  - genre: string
                  - energy: number (1-100 subjective intensity scale - NOT tempo)
                    1-20: Ambient/chill, 21-40: Relaxed, 41-60: Moderate, 61-80: High energy, 81-100: Peak intensity
                  - aiReasoning: string (IMPORTANT: explain how this track fits the "${genre}" style and "${mood}" mood, and how it transitions well from surrounding tracks)

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
    key: track.key,
    genre: track.genre,
    energy: track.energy,
    thumbnail: result?.thumbnail || `https://picsum.photos/seed/${Date.now()}/200/200`,
    aiReasoning: track.aiReasoning
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required', code: 'auth_required' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email

    // Check if user can generate (has credits)
    const canGenerate = await checkCanGenerate(userEmail)
    if (!canGenerate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: canGenerate.reason || 'No credits remaining',
          code: 'no_credits',
          creditsRemaining: 0
        },
        { status: 402 }
      )
    }

    // Get subscription to check provider access
    const subscription = await getUserSubscription(userEmail)
    const tierConfig = TIER_CONFIG[subscription.tier]

    const body: SwapTrackRequest = await request.json()
    const {
      currentTrack,
      previousTrack,
      nextTrack,
      targetEnergy,
      constraints,
      provider = 'openai',
      styleHint
    } = body

    // Check if user has access to the requested provider
    if (!tierConfig.providers.includes(provider)) {
      return NextResponse.json(
        {
          success: false,
          error: `${provider} is not available on your plan. Upgrade to Pro for access to all AI providers.`,
          code: 'provider_not_available'
        },
        { status: 403 }
      )
    }

    console.log('[Swap API] Request received:', {
      user: userEmail,
      provider,
      targetEnergy,
      currentTrack: currentTrack?.title,
      currentEnergy: currentTrack?.energy,
      styleHint
    })

    if (!currentTrack) {
      return NextResponse.json(
        { success: false, error: 'Current track is required' },
        { status: 400 }
      )
    }

    // Consume credit before making AI request
    await consumeCredit(userEmail)

    // Calculate target energy if not provided (1-100 scale)
    let finalTargetEnergy = targetEnergy
    if (!finalTargetEnergy) {
      if (previousTrack?.energy && nextTrack?.energy) {
        finalTargetEnergy = Math.round((previousTrack.energy + nextTrack.energy) / 2)
      } else if (previousTrack?.energy) {
        finalTargetEnergy = Math.min(100, previousTrack.energy + 5)
      } else if (nextTrack?.energy) {
        finalTargetEnergy = Math.max(1, nextTrack.energy - 5)
      } else {
        finalTargetEnergy = currentTrack.energy || 60
      }
    }

    const genre = currentTrack.genre || 'electronic dance music'
    // Use styleHint if provided, otherwise derive from energy
    const mood = styleHint || (currentTrack.energy && currentTrack.energy > 70 ? 'high energy' : 'groovy')
    const excludeArtists = [currentTrack.artist, previousTrack?.artist, nextTrack?.artist].filter(Boolean) as string[]

    console.log('[Swap API] Searching for track with energy', finalTargetEnergy, ', genre:', genre, ', mood/styleHint:', mood)

    let suggestedTrack: Partial<Track> | null = null

    switch (provider) {
      case 'claude':
        suggestedTrack = await suggestTrackWithClaude(finalTargetEnergy, genre, mood, excludeArtists)
        break
      case 'gemini':
        suggestedTrack = await suggestTrackWithGemini(finalTargetEnergy, genre, mood, excludeArtists)
        break
      case 'openai':
      default:
        suggestedTrack = await suggestTrackWithOpenAI(finalTargetEnergy, genre, mood, excludeArtists)
        break
    }

    if (!suggestedTrack) {
      throw new Error('AI failed to suggest a track')
    }

    // Enrich with YouTube data
    const newTrack = await enrichTrackWithYouTube(suggestedTrack)

    // Calculate transition quality based on energy (1-100 scale)
    let transitionQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'good'
    if (previousTrack?.energy && newTrack.energy) {
      const energyDiff = Math.abs(previousTrack.energy - newTrack.energy)
      if (energyDiff <= 5) transitionQuality = 'excellent'
      else if (energyDiff <= 10) transitionQuality = 'good'
      else if (energyDiff <= 20) transitionQuality = 'fair'
      else transitionQuality = 'poor'
    }

    console.log('[Swap API] Returning track:', newTrack.artist, '-', newTrack.title, 'with energy', newTrack.energy)

    return NextResponse.json({
      success: true,
      newTrack,
      transitionQuality,
      reasoning: newTrack.aiReasoning || `Selected "${newTrack.title}" by ${newTrack.artist} (Energy: ${newTrack.energy}) as an alternative that maintains flow with surrounding tracks.`,
      metadata: {
        provider,
        targetEnergy: finalTargetEnergy,
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
