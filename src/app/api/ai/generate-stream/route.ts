import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkCanGenerate, consumeCredit, getUserSubscription } from '@/lib/subscription'
import { TIER_CONFIG } from '@/lib/stripe'
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

  // === AI WIZARD PRO SETTINGS ===

  // Weighted phrases (multi-phrase blending)
  if (constraints?.weightedPhrases && constraints.weightedPhrases.length > 0) {
    const totalWeight = constraints.weightedPhrases.reduce((sum, wp) => sum + wp.weight, 0)
    const phrasesText = constraints.weightedPhrases.map(p => {
      const percentage = Math.round((p.weight / totalWeight) * 100)
      return `"${p.phrase}" (${percentage}%)`
    }).join(' + ')
    instructions.push(`VIBE BLENDING: Blend these vibes in the specified proportions: ${phrasesText}`)
  }

  // Avoid concepts
  if (constraints?.avoidConcepts && constraints.avoidConcepts.length > 0) {
    instructions.push(`AVOID THESE STYLES/CONCEPTS: ${constraints.avoidConcepts.join(', ')}`)
  }

  // Applied templates (style transforms)
  if (constraints?.appliedTemplates && constraints.appliedTemplates.length > 0) {
    const templateDescriptions: Record<string, string> = {
      'make-it-cinematic': 'cinematic, epic, film score-like quality',
      'make-it-danceable': 'danceable, rhythmic, groove-focused',
      'make-it-chill': 'relaxed, laid-back, chill atmosphere',
      'make-it-intense': 'intense, powerful, high-energy',
      'make-it-nostalgic': 'nostalgic, retro, throwback feel',
      'make-it-experimental': 'experimental, avant-garde, unconventional'
    }
    const transforms = constraints.appliedTemplates.map(t => templateDescriptions[t] || t.replace(/-/g, ' ')).join(', ')
    instructions.push(`STYLE TRANSFORMS: Apply these qualities to the playlist: ${transforms}`)
  }

  // Context tokens
  if (constraints?.contextTokens) {
    const contextParts: string[] = []
    if (constraints.contextTokens.timeOfDay) contextParts.push(`time of day: ${constraints.contextTokens.timeOfDay}`)
    if (constraints.contextTokens.season) contextParts.push(`season: ${constraints.contextTokens.season}`)
    if (constraints.contextTokens.weather) contextParts.push(`weather: ${constraints.contextTokens.weather}`)
    if (constraints.contextTokens.activity) contextParts.push(`activity: ${constraints.contextTokens.activity}`)
    if (constraints.contextTokens.socialContext) contextParts.push(`social vibe: ${constraints.contextTokens.socialContext}`)
    if (contextParts.length > 0) {
      instructions.push(`CONTEXTUAL ATMOSPHERE: Tailor tracks for ${contextParts.join(', ')}`)
    }
  }

  // Anchor tracks (must include)
  if (constraints?.anchorTracks && constraints.anchorTracks.length > 0) {
    const anchors = constraints.anchorTracks.map(t => `"${t.title}" by ${t.artist}`).join(', ')
    instructions.push(`MUST INCLUDE TRACKS: You MUST include these specific tracks in the playlist: ${anchors}`)
  }

  // Similar playlist reference
  if (constraints?.similarPlaylist?.url) {
    let similarText = `BASE ON REFERENCE: Create a playlist similar to the one at ${constraints.similarPlaylist.url}`
    if (constraints.similarPlaylist.modifier) {
      similarText += `, but ${constraints.similarPlaylist.modifier}`
    }
    instructions.push(similarText)
  }

  // Vocal density preferences
  if (constraints?.vocalDensity) {
    const vocalParts: string[] = []
    const { instrumentalVsVocal, hookyVsAtmospheric, lyricClarity } = constraints.vocalDensity
    if (instrumentalVsVocal < 30) vocalParts.push('prefer instrumental tracks')
    else if (instrumentalVsVocal > 70) vocalParts.push('prefer vocal-heavy tracks')
    if (hookyVsAtmospheric < 30) vocalParts.push('catchy, hooky songs with memorable melodies')
    else if (hookyVsAtmospheric > 70) vocalParts.push('atmospheric, ambient textures')
    if (lyricClarity < 30) vocalParts.push('clear, narrative lyrics')
    else if (lyricClarity > 70) vocalParts.push('abstract, buried, or processed vocals')
    if (vocalParts.length > 0) {
      instructions.push(`VOCAL PREFERENCES: ${vocalParts.join(', ')}`)
    }
  }

  // Energy preset
  if (constraints?.energyPreset) {
    switch (constraints.energyPreset) {
      case 'no-slow-songs':
        instructions.push('ENERGY RULE: Keep all tracks above 50 energy - no ballads or slow songs allowed')
        break
      case 'keep-it-mellow':
        instructions.push('ENERGY RULE: Keep energy soft and mellow throughout - nothing too intense')
        break
      case 'mid-tempo-groove':
        instructions.push('ENERGY RULE: Maintain mid-tempo groove between 60-75 energy')
        break
      case 'bpm-ramp':
        instructions.push('ENERGY RULE: Gradually increase BPM and energy throughout the set')
        break
    }
  }

  // Content mode
  if (constraints?.contentMode) {
    switch (constraints.contentMode) {
      case 'clean':
        instructions.push('CONTENT FILTER: Only include clean, radio-safe tracks - no explicit content')
        break
      case 'family':
        instructions.push('CONTENT FILTER: Family-friendly tracks only - appropriate for all ages')
        break
    }
  }

  // Long form input (deep context)
  if (constraints?.longFormInput && constraints.longFormInput.trim()) {
    const truncated = constraints.longFormInput.substring(0, 500)
    instructions.push(`DEEP CONTEXT: Use this as inspiration for the playlist mood and theme: "${truncated}${constraints.longFormInput.length > 500 ? '...' : ''}"`)
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
function createStreamingResponse(
  prompt: string,
  constraints: GeneratePlaylistRequest['constraints'],
  allowedProviders?: AIProvider[]
) {
  const encoder = new TextEncoder()

  // Determine which providers are available (both configured and allowed by tier)
  // Check for non-empty strings to handle shell env vars that might be set to ''
  const configuredProviders: AIProvider[] = []

  // Debug logging to identify env var issues
  console.log('[Stream API] Checking API keys:')
  console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 10)}... (len: ${process.env.OPENAI_API_KEY.length})` : 'NOT SET')
  console.log('  ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? `${process.env.ANTHROPIC_API_KEY.substring(0, 10)}... (len: ${process.env.ANTHROPIC_API_KEY.length})` : 'NOT SET')
  console.log('  GOOGLE_AI_API_KEY:', process.env.GOOGLE_AI_API_KEY ? `${process.env.GOOGLE_AI_API_KEY.substring(0, 10)}... (len: ${process.env.GOOGLE_AI_API_KEY.length})` : 'NOT SET')

  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0) configuredProviders.push('openai')
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 0) configuredProviders.push('claude')
  if (process.env.GOOGLE_AI_API_KEY && process.env.GOOGLE_AI_API_KEY.trim().length > 0) configuredProviders.push('gemini')

  // Filter to only allowed providers if specified (subscription tier restriction)
  const availableProviders: AIProvider[] = allowedProviders
    ? configuredProviders.filter(p => allowedProviders.includes(p))
    : configuredProviders

  // Calculate per-provider track count to speed up generation when combining results
  // If 3 providers: each gets ~1/3 of tracks, combined = full count
  // If 2 providers: each gets ~1/2 of tracks
  // If 1 provider: gets full track count
  const providerCount = availableProviders.length
  const requestedTrackCount = constraints?.trackCount || 8
  const perProviderTrackCount = providerCount > 1
    ? Math.ceil(requestedTrackCount / providerCount)
    : requestedTrackCount

  // Log which providers are available (without showing key values)
  console.log('[Stream API] Available providers:', availableProviders)
  console.log('[Stream API] Track count:', requestedTrackCount, '-> per provider:', perProviderTrackCount)
  console.log('[Stream API] Prompt:', prompt.substring(0, 100) + '...')

  // Create modified constraints with reduced track count per provider
  const perProviderConstraints = {
    ...constraints,
    trackCount: perProviderTrackCount
  }

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
                tracks = await generateWithOpenAI(prompt, perProviderConstraints)
                break
              case 'claude':
                tracks = await generateWithClaude(prompt, perProviderConstraints)
                break
              case 'gemini':
                tracks = await generateWithGemini(prompt, perProviderConstraints)
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
  // Check authentication
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'auth_required' },
      { status: 401 }
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

  // Get subscription to check allowed providers
  const subscription = await getUserSubscription(session.user.email)
  const tierConfig = TIER_CONFIG[subscription.tier as keyof typeof TIER_CONFIG]

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

  // Consume credit before generation
  await consumeCredit(session.user.email)

  return createStreamingResponse(prompt, finalConstraints, tierConfig.allowedProviders as unknown as AIProvider[])
}

// POST handler - for more complex constraint data
export async function POST(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'auth_required' },
      { status: 401 }
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

  // Get subscription to check allowed providers
  const subscription = await getUserSubscription(session.user.email)
  const tierConfig = TIER_CONFIG[subscription.tier as keyof typeof TIER_CONFIG]

  const body: GeneratePlaylistRequest = await request.json()
  const { prompt, constraints } = body

  console.log('[Stream API] POST request received')

  // Consume credit before generation
  await consumeCredit(session.user.email)

  return createStreamingResponse(prompt, constraints, tierConfig.allowedProviders as unknown as AIProvider[])
}
