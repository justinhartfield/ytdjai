import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkCanGenerate, consumeCredit, getUserSubscription } from '@/lib/subscription'
import { TIER_CONFIG } from '@/lib/stripe'
import { rateLimits, checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { batchSearchVideoData } from '@/lib/video-search'
import type { AIProvider, SegmentContext, PlaylistNode, StreamEvent, SegmentConstraints } from '@/types'

// Next.js route segment config - increase timeout for serverless functions
export const maxDuration = 60

// Type for AI response with alternatives
interface AITrackWithAlternatives {
  title: string
  artist: string
  bpm?: number
  key: string
  genre: string
  energy: number
  duration: number
  aiReasoning: string
  alternatives?: {
    title: string
    artist: string
    bpm?: number
    key: string
    genre: string
    energy: number
    duration: number
    whyNotChosen: string
    matchScore: number
  }[]
}

// Request body for regenerating a segment
interface RegenerateSegmentRequest {
  prompt: string // Base set prompt
  segment: SegmentContext
}

// Attempt to repair common JSON issues from AI responses
function repairJSON(jsonStr: string): string {
  let repaired = jsonStr

  let bracketCount = 0
  let lastValidEnd = -1
  let inString = false
  let escapeNext = false

  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i]

    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (char === '\\') {
      escapeNext = true
      continue
    }

    if (char === '"' && !escapeNext) {
      inString = !inString
      continue
    }

    if (!inString) {
      if (char === '[' || char === '{') {
        bracketCount++
      } else if (char === ']' || char === '}') {
        bracketCount--
        if (bracketCount === 0) {
          lastValidEnd = i
        }
      }
    }
  }

  if (lastValidEnd > 0 && lastValidEnd < repaired.length - 1) {
    repaired = repaired.substring(0, lastValidEnd + 1)
  }

  repaired = repaired.replace(/,(\s*[}\]])/g, '$1')

  return repaired
}

// Build segment-specific instructions for AI prompt
function buildSegmentInstructions(segment: SegmentContext): string {
  const instructions: string[] = []

  instructions.push(`\n=== REGENERATING SEGMENT: ${segment.name.toUpperCase()} ===`)
  instructions.push(`Generate exactly ${segment.targetTrackCount} REPLACEMENT tracks for the "${segment.name}" segment.`)

  if (segment.prompt?.trim()) {
    instructions.push(`SEGMENT VIBE: ${segment.prompt}`)
  }

  const sc = segment.constraints

  if (sc.energyRange) {
    instructions.push(`ENERGY: Keep energy between ${sc.energyRange.min}-${sc.energyRange.max} (1-100 scale)`)
  }

  if (sc.bpmRange) {
    instructions.push(`BPM: Keep BPM between ${sc.bpmRange.min}-${sc.bpmRange.max}`)
  }

  if (sc.moods && sc.moods.length > 0) {
    instructions.push(`MOODS: Focus on ${sc.moods.join(', ')} vibes`)
  }

  if (sc.preferredGenres && sc.preferredGenres.length > 0) {
    instructions.push(`PREFERRED GENRES: ${sc.preferredGenres.join(', ')}`)
  }

  if (sc.avoidGenres && sc.avoidGenres.length > 0) {
    instructions.push(`AVOID GENRES: ${sc.avoidGenres.join(', ')}`)
  }

  if (sc.activeDecades && sc.activeDecades.length > 0) {
    const decadeRanges: Record<string, string> = {
      '80s': '1980-1989', '90s': '1990-1999', '00s': '2000-2009', '10s': '2010-2019', '20s': '2020-present'
    }
    const ranges = sc.activeDecades.map(d => decadeRanges[d] || d).join(', ')
    instructions.push(`ERA: ${ranges}`)
  }

  if (sc.avoidExplicit) {
    instructions.push('CONTENT: Clean tracks only - no explicit content')
  }

  if (sc.discovery !== undefined) {
    if (sc.discovery < 30) {
      instructions.push('SELECTION: Use well-known hits')
    } else if (sc.discovery > 70) {
      instructions.push('SELECTION: Use deep cuts and obscure selections')
    }
  }

  if (segment.anchorTracks && segment.anchorTracks.length > 0) {
    const anchors = segment.anchorTracks.map(t => `"${t.title}" by ${t.artist}`).join(', ')
    instructions.push(`MUST INCLUDE: ${anchors}`)
  }

  if (segment.contextTracks) {
    if (segment.contextTracks.before && segment.contextTracks.before.length > 0) {
      const prevTracks = segment.contextTracks.before
        .map(n => `"${n.track.title}" by ${n.track.artist} (energy: ${n.track.energy || 'N/A'})`)
        .join(', ')
      instructions.push(`TRANSITION FROM: Previous segment ends with: ${prevTracks}. Ensure smooth transition.`)
    }

    if (segment.contextTracks.after && segment.contextTracks.after.length > 0) {
      const nextTracks = segment.contextTracks.after
        .map(n => `"${n.track.title}" by ${n.track.artist} (energy: ${n.track.energy || 'N/A'})`)
        .join(', ')
      instructions.push(`TRANSITION TO: Next segment starts with: ${nextTracks}. Ensure smooth transition.`)
    }
  }

  return instructions.join('\n')
}

// Generate with OpenAI
async function generateWithOpenAI(prompt: string, segment: SegmentContext): Promise<AITrackWithAlternatives[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OpenAI API key not configured')

  const segmentInstructions = buildSegmentInstructions(segment)
  console.log('[Regenerate-OpenAI] Starting request for segment:', segment.name)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    signal: AbortSignal.timeout(45000),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a DJ curator regenerating tracks for a specific segment of a DJ set. Generate a playlist as a JSON array. Each track object has:
- title, artist, key (e.g. "Am"), genre, energy (1-100 intensity), duration (seconds)
- aiReasoning: 1 sentence on why it fits this segment
- alternatives: array of 2 objects with title, artist, key, genre, energy, duration, whyNotChosen, matchScore (70-95)
Return ONLY valid JSON array, no markdown.${segmentInstructions}`
        },
        {
          role: 'user',
          content: `${segment.targetTrackCount} tracks for "${segment.name}" segment: ${prompt}. Energy: ${segment.constraints.energyRange?.min || 40}-${segment.constraints.energyRange?.max || 80}`
        }
      ],
      temperature: 0.9, // Slightly higher for regeneration to get different results
      max_tokens: 4000
    })
  })

  console.log('[Regenerate-OpenAI] Response status:', response.status)
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI HTTP ${response.status}: ${errorText.substring(0, 200)}`)
  }

  const data = await response.json()
  if (data.error) throw new Error(`OpenAI API error: ${data.error.message}`)

  if (data.choices?.[0]?.message?.content) {
    let content = data.choices[0].message.content
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        if (!Array.isArray(parsed)) throw new Error('Not an array')
        console.log('[Regenerate-OpenAI] Parsed', parsed.length, 'tracks')
        return parsed
      } catch {
        try {
          const repaired = repairJSON(jsonMatch[0])
          const parsed = JSON.parse(repaired)
          if (!Array.isArray(parsed)) throw new Error('Not an array')
          console.log('[Regenerate-OpenAI] Repaired and parsed', parsed.length, 'tracks')
          return parsed
        } catch (repairErr) {
          throw new Error(`OpenAI JSON parse failed: ${repairErr}`)
        }
      }
    }
  }
  throw new Error('OpenAI returned no valid content')
}

// Generate with Claude
async function generateWithClaude(prompt: string, segment: SegmentContext): Promise<AITrackWithAlternatives[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Anthropic API key not configured')

  const segmentInstructions = buildSegmentInstructions(segment)
  console.log('[Regenerate-Claude] Starting request for segment:', segment.name)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    signal: AbortSignal.timeout(45000),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `You are a professional DJ regenerating tracks for the "${segment.name}" segment: "${prompt}"
Requirements: ${segment.targetTrackCount} tracks, Energy ${segment.constraints.energyRange?.min || 40}-${segment.constraints.energyRange?.max || 80}
${segmentInstructions}

Return ONLY a JSON array with: title, artist, key, genre, energy (1-100), duration (seconds), aiReasoning, alternatives (2 objects with title, artist, key, genre, energy, duration, whyNotChosen, matchScore)`
      }]
    })
  })

  console.log('[Regenerate-Claude] Response status:', response.status)
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Claude HTTP ${response.status}: ${errorText.substring(0, 200)}`)
  }

  const data = await response.json()
  if (data.error) throw new Error(`Claude API error: ${data.error.message}`)

  if (data.content?.[0]?.text) {
    let text = data.content[0].text
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        if (!Array.isArray(parsed)) throw new Error('Not an array')
        console.log('[Regenerate-Claude] Parsed', parsed.length, 'tracks')
        return parsed
      } catch {
        try {
          const repaired = repairJSON(jsonMatch[0])
          const parsed = JSON.parse(repaired)
          if (!Array.isArray(parsed)) throw new Error('Not an array')
          console.log('[Regenerate-Claude] Repaired and parsed', parsed.length, 'tracks')
          return parsed
        } catch (repairErr) {
          throw new Error(`Claude JSON parse failed: ${repairErr}`)
        }
      }
    }
  }
  throw new Error('Claude returned no valid content')
}

// Generate with Gemini
async function generateWithGemini(prompt: string, segment: SegmentContext): Promise<AITrackWithAlternatives[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) throw new Error('Google AI API key not configured')

  const segmentInstructions = buildSegmentInstructions(segment)
  console.log('[Regenerate-Gemini] Starting request for segment:', segment.name)

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      signal: AbortSignal.timeout(45000),
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a professional DJ regenerating tracks for the "${segment.name}" segment: "${prompt}"
Requirements: ${segment.targetTrackCount} tracks, Energy ${segment.constraints.energyRange?.min || 40}-${segment.constraints.energyRange?.max || 80}
${segmentInstructions}

Return ONLY a JSON array with: title, artist, key, genre, energy (1-100), duration (seconds), aiReasoning, alternatives (2 objects with title, artist, key, genre, energy, duration, whyNotChosen, matchScore)`
          }]
        }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 4000 }
      })
    }
  )

  console.log('[Regenerate-Gemini] Response status:', response.status)
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini HTTP ${response.status}: ${errorText.substring(0, 200)}`)
  }

  const data = await response.json()
  if (data.error) throw new Error(`Gemini API error: ${data.error.message}`)

  if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
    let text = data.candidates[0].content.parts[0].text
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        if (!Array.isArray(parsed)) throw new Error('Not an array')
        console.log('[Regenerate-Gemini] Parsed', parsed.length, 'tracks')
        return parsed
      } catch {
        try {
          const repaired = repairJSON(jsonMatch[0])
          const parsed = JSON.parse(repaired)
          if (!Array.isArray(parsed)) throw new Error('Not an array')
          console.log('[Regenerate-Gemini] Repaired and parsed', parsed.length, 'tracks')
          return parsed
        } catch (repairErr) {
          throw new Error(`Gemini JSON parse failed: ${repairErr}`)
        }
      }
    }
  }
  throw new Error('Gemini returned no valid content')
}

// Convert AI tracks to PlaylistNodes with video enrichment
async function tracksToPlaylistNodes(tracks: AITrackWithAlternatives[], provider: AIProvider, segmentId: string): Promise<PlaylistNode[]> {
  if (!tracks || !Array.isArray(tracks)) {
    throw new Error(`${provider} returned invalid data - expected array`)
  }

  if (tracks.length === 0) {
    throw new Error(`${provider} returned empty playlist`)
  }

  // Prepare tracks for batch video search
  const tracksToSearch = tracks.map(track => ({
    title: track.title || 'Unknown Track',
    artist: track.artist || 'Unknown Artist'
  }))

  console.log(`[Regenerate-${provider}] Enriching ${tracksToSearch.length} tracks via Invidious/Piped + iTunes...`)

  // Batch search for video data
  const enrichedResults = await batchSearchVideoData(tracksToSearch, {
    skipYouTube: true,
    preferAlbumArt: true
  })

  return tracks.map((track, index) => {
    const enriched = enrichedResults.get(String(index))
    const timestamp = Date.now()

    return {
      id: `node-${provider}-${timestamp}-${index}`,
      track: {
        id: `track-${provider}-${timestamp}-${index}`,
        youtubeId: enriched?.videoId || '',
        title: track.title || 'Unknown Track',
        artist: track.artist || 'Unknown Artist',
        duration: enriched?.duration || track.duration || 240,
        key: track.key,
        genre: track.genre,
        energy: track.energy,
        thumbnail: enriched?.thumbnail || `https://picsum.photos/seed/${timestamp + index}/200/200`,
        aiReasoning: track.aiReasoning
      },
      position: index,
      sourceProvider: provider,
      segmentId,
      alternatives: (track.alternatives || []).map((alt, altIndex) => ({
        id: `alt-${provider}-${timestamp}-${index}-${altIndex}`,
        youtubeId: '',
        title: alt.title,
        artist: alt.artist,
        duration: alt.duration || 240,
        key: alt.key,
        genre: alt.genre,
        energy: alt.energy,
        thumbnail: `https://picsum.photos/seed/${timestamp + index + altIndex + 100}/200/200`,
        whyNotChosen: alt.whyNotChosen,
        matchScore: alt.matchScore
      })),
      transitionToNext: index < tracks.length - 1 ? {
        quality: 'good' as const,
        type: 'blend' as const,
        duration: 16
      } : undefined
    }
  })
}

// Create streaming response for segment regeneration
function createStreamingResponse(
  prompt: string,
  segment: SegmentContext,
  allowedProviders?: AIProvider[]
) {
  const encoder = new TextEncoder()

  const configuredProviders: AIProvider[] = []
  if (process.env.OPENAI_API_KEY?.trim()) configuredProviders.push('openai')
  if (process.env.ANTHROPIC_API_KEY?.trim()) configuredProviders.push('claude')
  if (process.env.GOOGLE_AI_API_KEY?.trim()) configuredProviders.push('gemini')

  const availableProviders: AIProvider[] = allowedProviders
    ? configuredProviders.filter(p => allowedProviders.includes(p))
    : configuredProviders

  console.log('[Regenerate API] Available providers:', availableProviders)
  console.log('[Regenerate API] Segment:', segment.name, '| Track count:', segment.targetTrackCount)

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: StreamEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch (e) {
          console.error('[Regenerate API] Failed to send event:', e)
        }
      }

      try {
        sendEvent({ event: 'started', providers: availableProviders })

        if (availableProviders.length === 0) {
          sendEvent({ event: 'all-failed', errors: [{ provider: 'openai', error: 'No AI providers configured' }] })
          controller.close()
          return
        }

        // Pick first available provider for segment regeneration (faster than parallel)
        const provider = availableProviders[0]
        sendEvent({ event: 'provider-started', provider })

        try {
          console.log(`[Regenerate API] Using ${provider} for segment regeneration`)
          let tracks: AITrackWithAlternatives[]

          switch (provider) {
            case 'openai':
              tracks = await generateWithOpenAI(prompt, segment)
              break
            case 'claude':
              tracks = await generateWithClaude(prompt, segment)
              break
            case 'gemini':
              tracks = await generateWithGemini(prompt, segment)
              break
            default:
              throw new Error(`Unknown provider: ${provider}`)
          }

          console.log(`[Regenerate API] ${provider} returned ${tracks.length} tracks`)
          const playlistNodes = await tracksToPlaylistNodes(tracks, provider, segment.id)

          console.log(`[Regenerate API] Enriched ${playlistNodes.length} tracks, sending primary-result`)
          sendEvent({ event: 'primary-result', provider, tracks: playlistNodes })
          sendEvent({
            event: 'complete',
            summary: {
              primary: provider,
              alternatives: [],
              failed: []
            }
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`[Regenerate API] ${provider} failed:`, errorMessage)
          sendEvent({ event: 'provider-failed', provider, error: errorMessage })
          sendEvent({ event: 'all-failed', errors: [{ provider, error: errorMessage }] })
        }
      } catch (error) {
        console.error('[Regenerate API] Fatal error:', error)
        sendEvent({ event: 'all-failed', errors: [{ provider: 'openai', error: error instanceof Error ? error.message : 'Unknown fatal error' }] })
      }

      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}

// POST handler for segment regeneration
export async function POST(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'auth_required' },
      { status: 401 }
    )
  }

  const userEmail = session.user.email

  // Rate limit check
  const rateLimit = await checkRateLimit(rateLimits.aiGenerate, userEmail)
  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Please wait before trying again.',
        code: 'rate_limited',
        retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: getRateLimitHeaders(rateLimit),
      }
    )
  }

  // Check credits
  const canGenerate = await checkCanGenerate(session.user.email)
  if (!canGenerate.allowed) {
    return NextResponse.json(
      {
        error: 'No credits remaining',
        code: 'no_credits',
        tier: canGenerate.tier,
        creditsRemaining: canGenerate.creditsRemaining
      },
      { status: 402 }
    )
  }

  // Get subscription to check allowed providers and Pro feature access
  const subscription = await getUserSubscription(session.user.email)
  const tierConfig = TIER_CONFIG[subscription.tier as keyof typeof TIER_CONFIG]

  // Check if user has access to segmented sets feature
  if (!tierConfig.hasSegmentedSets) {
    return NextResponse.json(
      {
        error: 'Segmented sets is a Pro feature',
        code: 'feature_not_available',
        tier: subscription.tier
      },
      { status: 403 }
    )
  }

  const body: RegenerateSegmentRequest = await request.json()
  const { prompt, segment } = body

  if (!segment || !segment.id || !segment.name) {
    return NextResponse.json(
      { error: 'Invalid segment data', code: 'invalid_request' },
      { status: 400 }
    )
  }

  console.log('[Regenerate API] POST request for segment:', segment.name)

  // Consume credit before generation
  await consumeCredit(session.user.email)

  return createStreamingResponse(prompt, segment, tierConfig.allowedProviders as unknown as AIProvider[])
}
