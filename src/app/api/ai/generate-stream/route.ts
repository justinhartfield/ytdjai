import { NextRequest } from 'next/server'
import type { AIProvider, GeneratePlaylistRequest, PlaylistNode, Track, AlternativeTrack, StreamEvent } from '@/types'

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

// Track YouTube quota state
let youtubeQuotaExhausted = false
let quotaExhaustedAt = 0

// Attempt to repair common JSON issues from AI responses
function repairJSON(jsonStr: string): string {
  let repaired = jsonStr

  // Remove any trailing incomplete objects/arrays
  // Find the last complete object by counting brackets
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

  // If we found a valid end point and there's trailing garbage, trim it
  if (lastValidEnd > 0 && lastValidEnd < repaired.length - 1) {
    repaired = repaired.substring(0, lastValidEnd + 1)
  }

  // Fix common issues: trailing commas before ] or }
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1')

  return repaired
}

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 240
  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)
  return hours * 3600 + minutes * 60 + seconds
}

// Build constraint instructions for AI prompt
function buildConstraintInstructions(constraints: GeneratePlaylistRequest['constraints']): string {
  const instructions: string[] = []

  if (constraints?.energyTolerance !== undefined) {
    const tolerance = constraints.energyTolerance
    if (tolerance <= 5) {
      instructions.push(`STRICT ENERGY TRANSITIONS: Adjacent tracks must be within ±${tolerance} energy points.`)
    } else if (tolerance <= 10) {
      instructions.push(`MODERATE ENERGY TRANSITIONS: Keep adjacent tracks within ±${tolerance} energy points when possible.`)
    }
  }

  if (constraints?.syncopation !== undefined) {
    const sync = constraints.syncopation
    if (sync < 30) {
      instructions.push('RHYTHM STYLE: Prefer tracks with simple, straightforward 4/4 beats.')
    } else if (sync > 70) {
      instructions.push('RHYTHM STYLE: Include tracks with complex rhythms and syncopation.')
    }
  }

  if (constraints?.keyMatch === 'strict') {
    instructions.push('KEY MATCHING: STRICTLY use harmonically compatible keys between adjacent tracks.')
  }

  if (constraints?.artistDiversity !== undefined && constraints.artistDiversity > 70) {
    instructions.push('ARTIST SELECTION: Use a different artist for each track. Maximize variety.')
  }

  if (constraints?.activeDecades && constraints.activeDecades.length > 0 && constraints.activeDecades.length < 5) {
    const decadeRanges: Record<string, string> = {
      '80s': '1980-1989', '90s': '1990-1999', '00s': '2000-2009', '10s': '2010-2019', '20s': '2020-present'
    }
    const ranges = constraints.activeDecades.map(d => decadeRanges[d] || d).join(', ')
    instructions.push(`ERA PREFERENCE: Focus on tracks from: ${ranges}`)
  }

  const discovery = constraints?.discovery ?? constraints?.novelty
  if (discovery !== undefined) {
    if (discovery < 30) {
      instructions.push('TRACK SELECTION: Prioritize well-known hits.')
    } else if (discovery > 70) {
      instructions.push('TRACK SELECTION: Prioritize deep cuts and obscure selections.')
    }
  }

  const blacklist = [...(constraints?.blacklist || []), ...(constraints?.excludeArtists || []), ...(constraints?.avoidArtists || [])]
  if (blacklist.length > 0) {
    instructions.push(`EXCLUSIONS: DO NOT include: ${blacklist.join(', ')}`)
  }

  if (constraints?.avoidExplicit) {
    instructions.push('CONTENT: Only include clean, non-explicit tracks.')
  }

  return instructions.join('\n')
}

// Generate with OpenAI
async function generateWithOpenAI(prompt: string, constraints: GeneratePlaylistRequest['constraints']): Promise<AITrackWithAlternatives[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OpenAI API key not configured')

  const constraintInstructions = buildConstraintInstructions(constraints)
  console.log('[OpenAI] Starting request...')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    signal: AbortSignal.timeout(45000), // 45 second timeout
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
          content: `You are a DJ curator. Generate a playlist as a JSON array. Each track object has:
- title, artist, key (e.g. "Am"), genre, energy (1-100 intensity), duration (seconds)
- aiReasoning: 1 sentence on why it fits
- alternatives: array of 2 objects with title, artist, key, genre, energy, duration, whyNotChosen, matchScore (70-95)
Return ONLY valid JSON array, no markdown.${constraintInstructions ? `\n\nConstraints:\n${constraintInstructions}` : ''}`
        },
        {
          role: 'user',
          content: `${constraints?.trackCount || 8} track set: ${prompt}. Energy: ${constraints?.energyRange?.min || 40}-${constraints?.energyRange?.max || 80}`
        }
      ],
      temperature: 0.8,
      max_tokens: 4000
    })
  })

  console.log('[OpenAI] Response status:', response.status)
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[OpenAI] HTTP error response:', errorText.substring(0, 500))
    throw new Error(`OpenAI HTTP ${response.status}: ${errorText.substring(0, 200)}`)
  }

  const data = await response.json()
  if (data.error) throw new Error(`OpenAI API error: ${data.error.message}`)

  if (data.choices?.[0]?.message?.content) {
    let content = data.choices[0].message.content
    console.log('[OpenAI] Raw response length:', content.length)
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        // Try direct parse first
        const parsed = JSON.parse(jsonMatch[0])
        if (!Array.isArray(parsed)) {
          throw new Error('Parsed result is not an array')
        }
        console.log('[OpenAI] Parsed', parsed.length, 'tracks')
        return parsed
      } catch (parseErr) {
        // Try to repair the JSON
        console.log('[OpenAI] Initial parse failed, attempting repair...')
        try {
          const repaired = repairJSON(jsonMatch[0])
          const parsed = JSON.parse(repaired)
          if (!Array.isArray(parsed)) {
            throw new Error('Repaired result is not an array')
          }
          console.log('[OpenAI] Repaired and parsed', parsed.length, 'tracks')
          return parsed
        } catch (repairErr) {
          console.error('[OpenAI] JSON parse error after repair:', repairErr)
          console.error('[OpenAI] Raw JSON (first 500 chars):', jsonMatch[0].substring(0, 500))
          throw new Error(`OpenAI JSON parse failed: ${parseErr}`)
        }
      }
    }
  }
  console.error('[OpenAI] No valid content found in response')
  throw new Error('OpenAI returned no valid content')
}

// Generate with Claude
async function generateWithClaude(prompt: string, constraints: GeneratePlaylistRequest['constraints']): Promise<AITrackWithAlternatives[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Anthropic API key not configured')

  const constraintInstructions = buildConstraintInstructions(constraints)
  console.log('[Claude] Starting request...')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    signal: AbortSignal.timeout(45000), // 45 second timeout
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
        content: `You are a professional DJ. Generate a playlist for: "${prompt}"
Requirements: ${constraints?.trackCount || 8} tracks, Energy ${constraints?.energyRange?.min || 40}-${constraints?.energyRange?.max || 80}
${constraintInstructions ? `Constraints:\n${constraintInstructions}` : ''}

Return ONLY a JSON array with: title, artist, key, genre, energy (1-100), duration (seconds), aiReasoning, alternatives (2 objects with title, artist, key, genre, energy, duration, whyNotChosen, matchScore)`
      }]
    })
  })

  console.log('[Claude] Response status:', response.status)
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Claude] HTTP error response:', errorText.substring(0, 500))
    throw new Error(`Claude HTTP ${response.status}: ${errorText.substring(0, 200)}`)
  }

  const data = await response.json()
  if (data.error) throw new Error(`Claude API error: ${data.error.message}`)

  if (data.content?.[0]?.text) {
    let text = data.content[0].text
    console.log('[Claude] Raw response length:', text.length)
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        if (!Array.isArray(parsed)) {
          throw new Error('Parsed result is not an array')
        }
        console.log('[Claude] Parsed', parsed.length, 'tracks')
        return parsed
      } catch (parseErr) {
        // Try to repair the JSON
        console.log('[Claude] Initial parse failed, attempting repair...')
        try {
          const repaired = repairJSON(jsonMatch[0])
          const parsed = JSON.parse(repaired)
          if (!Array.isArray(parsed)) {
            throw new Error('Repaired result is not an array')
          }
          console.log('[Claude] Repaired and parsed', parsed.length, 'tracks')
          return parsed
        } catch (repairErr) {
          console.error('[Claude] JSON parse error after repair:', repairErr)
          console.error('[Claude] Raw JSON (first 500 chars):', jsonMatch[0].substring(0, 500))
          throw new Error(`Claude JSON parse failed: ${parseErr}`)
        }
      }
    }
  }
  console.error('[Claude] No valid content found in response')
  throw new Error('Claude returned no valid content')
}

// Generate with Gemini
async function generateWithGemini(prompt: string, constraints: GeneratePlaylistRequest['constraints']): Promise<AITrackWithAlternatives[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) throw new Error('Google AI API key not configured')

  const constraintInstructions = buildConstraintInstructions(constraints)
  console.log('[Gemini] Starting request...')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      signal: AbortSignal.timeout(45000), // 45 second timeout
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a professional DJ. Generate a playlist for: "${prompt}"
Requirements: ${constraints?.trackCount || 8} tracks, Energy ${constraints?.energyRange?.min || 40}-${constraints?.energyRange?.max || 80}
${constraintInstructions ? `Constraints:\n${constraintInstructions}` : ''}

Return ONLY a JSON array with: title, artist, key, genre, energy (1-100), duration (seconds), aiReasoning, alternatives (2 objects with title, artist, key, genre, energy, duration, whyNotChosen, matchScore)`
          }]
        }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 4000 }
      })
    }
  )

  console.log('[Gemini] Response status:', response.status)
  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Gemini] HTTP error response:', errorText.substring(0, 500))
    throw new Error(`Gemini HTTP ${response.status}: ${errorText.substring(0, 200)}`)
  }

  const data = await response.json()
  if (data.error) throw new Error(`Gemini API error: ${data.error.message}`)

  if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
    let text = data.candidates[0].content.parts[0].text
    console.log('[Gemini] Raw response length:', text.length)
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '')
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        if (!Array.isArray(parsed)) {
          throw new Error('Parsed result is not an array')
        }
        console.log('[Gemini] Parsed', parsed.length, 'tracks')
        return parsed
      } catch (parseErr) {
        // Try to repair the JSON
        console.log('[Gemini] Initial parse failed, attempting repair...')
        try {
          const repaired = repairJSON(jsonMatch[0])
          const parsed = JSON.parse(repaired)
          if (!Array.isArray(parsed)) {
            throw new Error('Repaired result is not an array')
          }
          console.log('[Gemini] Repaired and parsed', parsed.length, 'tracks')
          return parsed
        } catch (repairErr) {
          console.error('[Gemini] JSON parse error after repair:', repairErr)
          console.error('[Gemini] Raw JSON (first 500 chars):', jsonMatch[0].substring(0, 500))
          throw new Error(`Gemini JSON parse failed: ${parseErr}`)
        }
      }
    }
  }
  console.error('[Gemini] No valid content found in response')
  throw new Error('Gemini returned no valid content')
}

// Convert AI tracks to PlaylistNodes
function tracksToPlaylistNodes(tracks: AITrackWithAlternatives[], provider: AIProvider): PlaylistNode[] {
  // Validate tracks is an array
  if (!tracks || !Array.isArray(tracks)) {
    console.error(`[${provider}] Invalid tracks data:`, tracks)
    throw new Error(`${provider} returned invalid data - expected array but got ${typeof tracks}`)
  }

  if (tracks.length === 0) {
    console.error(`[${provider}] Empty tracks array`)
    throw new Error(`${provider} returned empty playlist`)
  }

  return tracks.map((track, index) => ({
    id: `node-${provider}-${Date.now()}-${index}`,
    track: {
      id: `track-${provider}-${Date.now()}-${index}`,
      youtubeId: '', // Will be enriched later
      title: track.title || 'Unknown Track',
      artist: track.artist || 'Unknown Artist',
      duration: track.duration || 240,
      key: track.key,
      genre: track.genre,
      energy: track.energy,
      thumbnail: `https://picsum.photos/seed/${Date.now() + index}/200/200`,
      aiReasoning: track.aiReasoning
    },
    position: index,
    sourceProvider: provider, // Tag which AI generated this track
    alternatives: (track.alternatives || []).map((alt, altIndex) => ({
      id: `alt-${provider}-${Date.now()}-${index}-${altIndex}`,
      youtubeId: '',
      title: alt.title,
      artist: alt.artist,
      duration: alt.duration || 240,
      key: alt.key,
      genre: alt.genre,
      energy: alt.energy,
      thumbnail: `https://picsum.photos/seed/${Date.now() + index + altIndex + 100}/200/200`,
      whyNotChosen: alt.whyNotChosen,
      matchScore: alt.matchScore
    })),
    transitionToNext: index < tracks.length - 1 ? {
      quality: 'good' as const,
      type: 'blend' as const,
      duration: 16
    } : undefined
  }))
}

// YouTube search with duration fetch
async function enrichTrackWithYouTube(track: Partial<Track>, apiKey: string): Promise<Partial<Track>> {
  // Skip if quota exhausted (reset after 5 minutes)
  if (youtubeQuotaExhausted && Date.now() - quotaExhaustedAt < 5 * 60 * 1000) {
    return track
  }

  try {
    const query = `${track.artist} - ${track.title} official audio`
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    )

    if (!searchResponse.ok) {
      if (searchResponse.status === 403) {
        youtubeQuotaExhausted = true
        quotaExhaustedAt = Date.now()
      }
      return track
    }

    youtubeQuotaExhausted = false
    const searchData = await searchResponse.json()

    if (!searchData.items?.[0]) return track

    const videoId = searchData.items[0].id.videoId
    const thumbnail = searchData.items[0].snippet.thumbnails?.high?.url

    // Fetch duration
    const durationResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    )

    let duration = track.duration || 240
    if (durationResponse.ok) {
      const durationData = await durationResponse.json()
      if (durationData.items?.[0]?.contentDetails?.duration) {
        duration = parseISO8601Duration(durationData.items[0].contentDetails.duration)
      }
    }

    return {
      ...track,
      youtubeId: videoId,
      thumbnail,
      duration
    }
  } catch {
    return track
  }
}

// Helper to create the streaming response
function createStreamingResponse(prompt: string, constraints: GeneratePlaylistRequest['constraints']) {
  const encoder = new TextEncoder()

  // Determine which providers are available
  const availableProviders: AIProvider[] = []
  if (process.env.OPENAI_API_KEY) availableProviders.push('openai')
  if (process.env.ANTHROPIC_API_KEY) availableProviders.push('claude')
  if (process.env.GOOGLE_AI_API_KEY) availableProviders.push('gemini')

  // Log which providers are available (without showing key values)
  console.log('[Stream API] Available providers:', availableProviders)
  console.log('[Stream API] Prompt:', prompt.substring(0, 100) + '...')

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: StreamEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch (e) {
          console.error('[Stream API] Failed to send event:', e)
        }
      }

      try {
        // Signal start
        sendEvent({ event: 'started', providers: availableProviders })

        if (availableProviders.length === 0) {
          sendEvent({ event: 'all-failed', errors: [{ provider: 'openai', error: 'No AI providers configured' }] })
          controller.close()
          return
        }

        let primaryProvider: AIProvider | null = null
        const completedProviders: AIProvider[] = []
        const failures: { provider: AIProvider; error: string }[] = []
        const youtubeApiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_AI_API_KEY

        // Send heartbeat to keep connection alive (Netlify has 26s timeout)
        let heartbeatActive = true
        const heartbeatInterval = setInterval(() => {
          if (heartbeatActive) {
            try {
              controller.enqueue(encoder.encode(`: heartbeat\n\n`))
            } catch {
              // Connection closed, stop heartbeat
              heartbeatActive = false
            }
          }
        }, 5000) // Send heartbeat every 5 seconds

        // Use Promise.race pattern to get first result quickly while others continue
        const generateForProvider = async (provider: AIProvider): Promise<{
          provider: AIProvider
          tracks: PlaylistNode[]
        } | null> => {
          sendEvent({ event: 'provider-started', provider })

          try {
            console.log(`[Stream API] Starting ${provider} generation...`)
            let tracks: AITrackWithAlternatives[]

            switch (provider) {
              case 'openai':
                tracks = await generateWithOpenAI(prompt, constraints)
                break
              case 'claude':
                tracks = await generateWithClaude(prompt, constraints)
                break
              case 'gemini':
                tracks = await generateWithGemini(prompt, constraints)
                break
              default:
                throw new Error(`Unknown provider: ${provider}`)
            }

            console.log(`[Stream API] ${provider} returned ${tracks.length} tracks`)
            const playlistNodes = tracksToPlaylistNodes(tracks, provider)

            // Determine if this is primary or alternative
            if (primaryProvider === null) {
              primaryProvider = provider
              console.log(`[Stream API] ${provider} is primary, sending result...`)
              sendEvent({ event: 'primary-result', provider, tracks: playlistNodes })

              // Start YouTube enrichment for primary tracks (limit to avoid timeout)
              if (youtubeApiKey) {
                const enrichLimit = Math.min(playlistNodes.length, 5) // Limit to 5 to avoid timeout
                for (let i = 0; i < enrichLimit; i++) {
                  const track = playlistNodes[i].track
                  const enrichedTrack = await enrichTrackWithYouTube(track, youtubeApiKey)
                  if (enrichedTrack.youtubeId && !enrichedTrack.youtubeId.startsWith('pending-')) {
                    sendEvent({ event: 'track-enriched', provider, index: i, track: enrichedTrack })
                  }
                }
              }
            } else {
              console.log(`[Stream API] ${provider} is alternative, sending result...`)
              sendEvent({ event: 'alternative-result', provider, tracks: playlistNodes })
            }

            completedProviders.push(provider)
            return { provider, tracks: playlistNodes }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error(`[Stream API] ${provider} failed:`, errorMessage)
            failures.push({ provider, error: errorMessage })
            sendEvent({ event: 'provider-failed', provider, error: errorMessage })
            return null
          }
        }

        // Run all providers in parallel
        console.log('[Stream API] Starting all providers in parallel...')
        await Promise.allSettled(
          availableProviders.map(provider => generateForProvider(provider))
        )
        console.log('[Stream API] All providers completed. Successes:', completedProviders.length, 'Failures:', failures.length)

        // Send completion event
        if (completedProviders.length > 0) {
          sendEvent({
            event: 'complete',
            summary: {
              primary: primaryProvider,
              alternatives: completedProviders.filter(p => p !== primaryProvider),
              failed: failures.map(f => f.provider)
            }
          })
        } else {
          sendEvent({ event: 'all-failed', errors: failures })
        }

        // Stop heartbeat
        heartbeatActive = false
        clearInterval(heartbeatInterval)
      } catch (error) {
        console.error('[Stream API] Fatal error:', error)
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

// GET handler - for EventSource which only supports GET
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const prompt = searchParams.get('prompt') || ''
  const trackCount = parseInt(searchParams.get('trackCount') || '8')
  const energyMin = parseInt(searchParams.get('energyMin') || '40')
  const energyMax = parseInt(searchParams.get('energyMax') || '80')
  const constraintsJson = searchParams.get('constraints')

  const constraints: GeneratePlaylistRequest['constraints'] = constraintsJson
    ? JSON.parse(constraintsJson)
    : { trackCount, energyRange: { min: energyMin, max: energyMax } }

  const finalConstraints = {
    ...constraints,
    trackCount,
    energyRange: { min: energyMin, max: energyMax }
  }

  return createStreamingResponse(prompt, finalConstraints)
}

// POST handler - for more complex constraint data
export async function POST(request: NextRequest) {
  const body: GeneratePlaylistRequest = await request.json()
  const { prompt, constraints } = body

  console.log('[Stream API] POST request received')

  return createStreamingResponse(prompt, constraints)
}
