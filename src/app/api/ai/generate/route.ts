import { NextRequest, NextResponse } from 'next/server'
import type { AIProvider, GeneratePlaylistRequest, PlaylistNode, Track, AlternativeTrack } from '@/types'
import { batchSearchVideoData, type EnrichedTrackData } from '@/lib/video-search'
import { keyToCamelot } from '@/lib/camelot'

// Next.js route segment config - increase timeout for serverless functions
export const maxDuration = 60 // seconds (requires Netlify Pro or Vercel Pro)

// Request-level timeout tracking for Netlify (hard limit ~26s)
const NETLIFY_SAFE_TIMEOUT = 25000 // 25 seconds - pushing closer to Netlify's ~26s limit
let requestStartTime = 0

function timeRemaining(): number {
  return Math.max(0, NETLIFY_SAFE_TIMEOUT - (Date.now() - requestStartTime))
}

function shouldSkipEnrichment(): boolean {
  // Skip enrichment if we have less than 8 seconds remaining
  return timeRemaining() < 8000
}

// Type for AI response with alternatives
interface AITrackWithAlternatives {
  title: string
  artist: string
  bpm?: number
  key: string
  genre: string
  energy: number // 1-100 subjective intensity (NOT tempo)
  duration: number
  aiReasoning: string
  alternatives?: {
    title: string
    artist: string
    bpm?: number
    key: string
    genre: string
    energy: number // 1-100 subjective intensity
    duration: number
    whyNotChosen: string
    matchScore: number
  }[]
}

// Fetch with timeout - abort if we're running out of time
async function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs?: number): Promise<Response> {
  const timeout = timeoutMs || Math.min(timeRemaining(), 5000)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * Enrich tracks using the new video search service
 * Uses Invidious/Piped + iTunes for album art - NO YouTube API calls
 * YouTube API is only used at export time now
 */
async function enrichTracksWithVideoSearch(tracks: Partial<Track>[]): Promise<Partial<Track>[]> {
  // Check if we should skip enrichment entirely due to time constraints
  if (shouldSkipEnrichment()) {
    console.log('[VideoSearch] Skipping enrichment - running low on time')
    return tracks.map(track => ({
      ...track,
      thumbnail: track.thumbnail || `https://picsum.photos/seed/${Date.now()}/200/200`,
    }))
  }

  console.log(`[VideoSearch] Enriching ${tracks.length} tracks via Invidious/Piped + iTunes (${timeRemaining()}ms remaining)...`)

  // Build track list for batch search
  const trackList = tracks.map(t => ({
    artist: t.artist || 'Unknown Artist',
    title: t.title || 'Unknown Track',
  }))

  // Use the new video search service (NO YouTube API calls)
  const results = await batchSearchVideoData(trackList, {
    skipYouTube: true, // Never use YouTube API during generation
    preferAlbumArt: true, // Use iTunes for high-quality album art
  })

  // Merge results back into tracks
  const enrichedTracks = tracks.map(track => {
    const key = `${track.artist}:${track.title}`
    const enrichment = results.get(key)

    if (enrichment) {
      console.log(`[VideoSearch] Enriched: "${track.artist} - ${track.title}" -> videoId: ${enrichment.videoId || 'none'}, source: ${enrichment.source}`)
      return {
        ...track,
        youtubeId: enrichment.videoId || track.youtubeId || '',
        thumbnail: enrichment.thumbnail || track.thumbnail || `https://picsum.photos/seed/${Date.now()}/200/200`,
        duration: enrichment.duration || track.duration || 240,
      }
    }

    console.warn(`[VideoSearch] No enrichment for: "${track.artist} - ${track.title}"`)
    return {
      ...track,
      thumbnail: track.thumbnail || `https://picsum.photos/seed/${Date.now()}/200/200`,
    }
  })

  const withVideoId = enrichedTracks.filter(t => t.youtubeId).length
  const withThumbnail = enrichedTracks.filter(t => t.thumbnail && !t.thumbnail.includes('picsum')).length
  console.log(`[VideoSearch] Enrichment complete: ${withVideoId}/${tracks.length} with videoId, ${withThumbnail}/${tracks.length} with album art`)

  return enrichedTracks
}

// Build constraint instructions for AI prompt
function buildConstraintInstructions(constraints: GeneratePlaylistRequest['constraints']): string {
  const instructions: string[] = []

  // Energy Tolerance
  if (constraints?.energyTolerance !== undefined) {
    const tolerance = constraints.energyTolerance
    if (tolerance <= 5) {
      instructions.push(`STRICT ENERGY TRANSITIONS: Adjacent tracks must be within ±${tolerance} energy points of each other for smooth flow.`)
    } else if (tolerance <= 10) {
      instructions.push(`MODERATE ENERGY TRANSITIONS: Keep adjacent tracks within ±${tolerance} energy points when possible.`)
    } else {
      instructions.push(`FLEXIBLE ENERGY TRANSITIONS: Energy can vary up to ±${tolerance} points between tracks.`)
    }
  }

  // Beat Complexity / Syncopation
  if (constraints?.syncopation !== undefined) {
    const sync = constraints.syncopation
    if (sync < 30) {
      instructions.push('RHYTHM STYLE: Prefer tracks with simple, straightforward 4/4 beats and minimal syncopation.')
    } else if (sync > 70) {
      instructions.push('RHYTHM STYLE: Include tracks with complex rhythms, syncopation, polyrhythms, and intricate percussion.')
    } else {
      instructions.push('RHYTHM STYLE: Mix of straightforward and moderately complex rhythms.')
    }
  }

  // Key Compatibility
  if (constraints?.keyMatch === 'strict') {
    instructions.push('KEY MATCHING: STRICTLY use harmonically compatible keys between adjacent tracks (same key, relative major/minor, or keys in the Camelot wheel that are adjacent).')
  } else if (constraints?.keyMatch === 'loose') {
    instructions.push('KEY MATCHING: Consider key compatibility but prioritize overall vibe over strict harmonic mixing.')
  }

  // Artist Diversity
  if (constraints?.artistDiversity !== undefined) {
    const diversity = constraints.artistDiversity
    if (diversity < 30) {
      instructions.push('ARTIST SELECTION: It\'s OK to repeat artists multiple times in the set.')
    } else if (diversity > 70) {
      instructions.push('ARTIST SELECTION: IMPORTANT - Use a different artist for each track. Maximize variety.')
    } else {
      instructions.push('ARTIST SELECTION: Try to vary artists, but occasional repeats are acceptable.')
    }
  }

  // Active Decades
  if (constraints?.activeDecades && constraints.activeDecades.length > 0 && constraints.activeDecades.length < 5) {
    const decadeRanges: Record<string, string> = {
      '80s': '1980-1989',
      '90s': '1990-1999',
      '00s': '2000-2009',
      '10s': '2010-2019',
      '20s': '2020-present'
    }
    const ranges = constraints.activeDecades.map(d => decadeRanges[d] || d).join(', ')
    instructions.push(`ERA PREFERENCE: Focus on tracks from these periods: ${ranges}`)
  }

  // Discovery / Novelty
  const discovery = constraints?.discovery ?? constraints?.novelty
  if (discovery !== undefined) {
    if (discovery < 30) {
      instructions.push('TRACK SELECTION: Prioritize well-known hits, popular tracks, and recognizable songs that most people would know.')
    } else if (discovery > 70) {
      instructions.push('TRACK SELECTION: Prioritize deep cuts, underground tracks, lesser-known gems, and obscure selections over mainstream hits.')
    } else {
      instructions.push('TRACK SELECTION: Balance between popular tracks and deeper cuts.')
    }
  }

  // Blacklist
  const blacklist = [...(constraints?.blacklist || []), ...(constraints?.excludeArtists || []), ...(constraints?.avoidArtists || [])]
  if (blacklist.length > 0) {
    instructions.push(`EXCLUSIONS: DO NOT include any tracks by or similar to: ${blacklist.join(', ')}`)
  }

  // Avoid explicit
  if (constraints?.avoidExplicit) {
    instructions.push('CONTENT: Only include clean, non-explicit tracks.')
  }

  return instructions.join('\n')
}

async function generateWithOpenAI(prompt: string, constraints: GeneratePlaylistRequest['constraints']): Promise<PlaylistNode[]> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.error('[OpenAI] No API key configured')
    throw new Error('OpenAI API key not configured')
  }

  const constraintInstructions = buildConstraintInstructions(constraints)

  try {
    // Use timeout-aware fetch for AI call (allow 12 seconds max for AI response)
    const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast model for Netlify timeout constraints
        messages: [
          {
            role: 'system',
            content: `You are a DJ curator. Generate a playlist as a JSON array. Each track object has:
- title, artist, bpm (estimated tempo 60-200), key (e.g. "Am"), genre, energy (1-100 intensity), duration (seconds)
- aiReasoning: 1 sentence on why it fits the theme
- alternatives: array of 2 objects with title, artist, bpm, key, genre, energy, duration, whyNotChosen (1 sentence), matchScore (70-95)

Energy scale: 1-20 chill, 21-40 groovy, 41-60 moderate, 61-80 driving, 81-100 peak.
BPM guide: house~125, techno~130, dnb~174, hip-hop~90, pop~110.
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
    }, 60000) // 60 second timeout for OpenAI

    const data = await response.json()

    // Check for API errors first
    if (data.error) {
      console.error('[OpenAI] API Error:', data.error)
      throw new Error(`OpenAI API error: ${data.error.message || JSON.stringify(data.error)}`)
    }

    if (data.choices?.[0]?.message?.content) {
      let content = data.choices[0].message.content
      console.log('[OpenAI] Raw response:', content.substring(0, 300))

      // Remove markdown code blocks if present
      content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '')

      // Try to parse JSON, handle truncated responses
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const tracks = JSON.parse(jsonMatch[0])
          console.log('[OpenAI] Parsed', tracks.length, 'tracks')
          return await tracksToPlaylistNodes(tracks, constraints?.energyTolerance || 10, true, 'openai')
        }
      } catch (parseError) {
        // Try to fix truncated JSON by finding last complete object
        console.log('[OpenAI] JSON parse failed, attempting recovery...')
        const lastCompleteArray = content.lastIndexOf('}]')
        if (lastCompleteArray > 0) {
          content = content.substring(0, lastCompleteArray + 2)
          const jsonMatch = content.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            const tracks = JSON.parse(jsonMatch[0])
            console.log('[OpenAI] Recovered', tracks.length, 'tracks from truncated response')
            return await tracksToPlaylistNodes(tracks, constraints?.energyTolerance || 10, true, 'openai')
          }
        }
        throw parseError
      }
    }

    console.error('[OpenAI] No valid response content:', JSON.stringify(data).substring(0, 500))
    throw new Error('OpenAI returned no valid content')
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[OpenAI] Request timed out')
      throw new Error('OpenAI request timed out - try again or reduce track count')
    }
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

  const constraintInstructions = buildConstraintInstructions(constraints)

  try {
    // Use timeout-aware fetch for AI call (allow 12 seconds max for AI response)
    const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `You are a professional DJ and music curator. Generate a playlist based on this description: "${prompt}"

            Requirements:
            - Track count: ${constraints?.trackCount || 8}
            - Energy range: ${constraints?.energyRange?.min || 40}-${constraints?.energyRange?.max || 80} (1-100 scale)
            - Moods: ${constraints?.moods?.join(', ') || 'varied'}

${constraintInstructions ? `CURATION CONSTRAINTS (follow these carefully):\n${constraintInstructions}` : ''}

            Return ONLY a JSON array of track objects with these fields:
            - title: string (track name)
            - artist: string (artist name)
            - bpm: number (estimated tempo 60-200, e.g. house~125, techno~130, dnb~174, hip-hop~90)
            - key: string (musical key like "Am", "F#m", "C")
            - genre: string (music genre)
            - energy: number (1-100 subjective intensity scale, NOT tempo)
              1-20: Ambient/chill - downtempo, atmospheric, relaxing
              21-40: Relaxed, groovy - laid-back beats, smooth vibes
              41-60: Moderate, steady - balanced energy, consistent drive
              61-80: High energy, driving - uplifting, powerful, building
              81-100: Peak intensity, aggressive - drops, maximum impact
              Based on: aggression, rhythmic intensity, emotional intensity, builds/drops - NOT just tempo
            - duration: number (in seconds)
            - aiReasoning: string (IMPORTANT: 1-2 sentences explaining how this specific track fits the user's theme "${prompt}" AND how it transitions from the previous track. Reference the theme directly in your reasoning.)
            - alternatives: array of 2 alternative track objects, each with:
              - title, artist, bpm, key, genre, energy, duration (same fields as main track)
              - whyNotChosen: string (1 sentence explaining why this wasn't the primary pick but is still a great alternative)
              - matchScore: number (70-95, how well this alternative fits the slot)

            Consider transitions - adjacent tracks should have compatible energy levels and keys.
            Each track's aiReasoning MUST explicitly reference the user's theme to explain why it was selected.
            The alternatives should be genuinely good options that almost made the cut - similar style, compatible energy/key.`
          }
        ]
      })
    }, 20000)

    const data = await response.json()

    // Check for API errors first
    if (data.error) {
      console.error('[Claude] API Error:', data.error)
      throw new Error(`Claude API error: ${data.error.message || JSON.stringify(data.error)}`)
    }

    if (data.content?.[0]?.text) {
      // Extract JSON from response
      let text = data.content[0].text
      console.log('[Claude] Raw response:', text.substring(0, 300))

      // Remove markdown code blocks if present
      text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '')

      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const tracks = JSON.parse(jsonMatch[0])
        console.log('[Claude] Parsed', tracks.length, 'tracks')
        return await tracksToPlaylistNodes(tracks, constraints?.energyTolerance || 10, true, 'claude')
      }
    }

    console.error('[Claude] No valid response content:', JSON.stringify(data).substring(0, 500))
    throw new Error('Claude returned no valid content')
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[Claude] Request timed out')
      throw new Error('Claude request timed out - try again or reduce track count')
    }
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

  const constraintInstructions = buildConstraintInstructions(constraints)

  try {
    // Use timeout-aware fetch for AI call (allow 12 seconds max for AI response)
    const response = await fetchWithTimeout(
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
                  text: `You are a professional DJ and music curator. Generate a playlist based on this description: "${prompt}"

                  Requirements:
                  - Track count: ${constraints?.trackCount || 8}
                  - Energy range: ${constraints?.energyRange?.min || 40}-${constraints?.energyRange?.max || 80} (1-100 scale)
                  - Moods: ${constraints?.moods?.join(', ') || 'varied'}

${constraintInstructions ? `CURATION CONSTRAINTS (follow these carefully):\n${constraintInstructions}` : ''}

                  Return ONLY a JSON array of track objects with these fields:
                  - title: string (track name)
                  - artist: string (artist name)
                  - bpm: number (estimated tempo 60-200, e.g. house~125, techno~130, dnb~174, hip-hop~90)
                  - key: string (musical key like "Am", "F#m", "C")
                  - genre: string (music genre)
                  - energy: number (1-100 subjective intensity scale, NOT tempo)
                    1-20: Ambient/chill - downtempo, atmospheric, relaxing
                    21-40: Relaxed, groovy - laid-back beats, smooth vibes
                    41-60: Moderate, steady - balanced energy, consistent drive
                    61-80: High energy, driving - uplifting, powerful, building
                    81-100: Peak intensity, aggressive - drops, maximum impact
                    Based on: aggression, rhythmic intensity, emotional intensity, builds/drops - NOT just tempo
                  - duration: number (in seconds)
                  - aiReasoning: string (IMPORTANT: 1-2 sentences explaining how this specific track fits the user's theme "${prompt}" AND how it transitions from the previous track. Reference the theme directly in your reasoning.)
                  - alternatives: array of 2 alternative track objects, each with:
                    - title, artist, bpm, key, genre, energy, duration (same fields as main track)
                    - whyNotChosen: string (1 sentence explaining why this wasn't the primary pick but is still a great alternative)
                    - matchScore: number (70-95, how well this alternative fits the slot)

                  Consider transitions - adjacent tracks should have compatible energy levels and keys.
                  Each track's aiReasoning MUST explicitly reference the user's theme to explain why it was selected.
                  The alternatives should be genuinely good options that almost made the cut - similar style, compatible energy/key.`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 2000
          }
        })
      },
      20000
    )

    const data = await response.json()

    // Check for API errors first
    if (data.error) {
      console.error('[Gemini] API Error:', data.error)
      throw new Error(`Gemini API error: ${data.error.message || JSON.stringify(data.error)}`)
    }

    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      let text = data.candidates[0].content.parts[0].text
      console.log('[Gemini] Raw response:', text.substring(0, 300))

      // Remove markdown code blocks if present
      text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '')

      // Try to parse JSON, handle truncated responses
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const tracks = JSON.parse(jsonMatch[0])
          console.log('[Gemini] Parsed', tracks.length, 'tracks')
          return await tracksToPlaylistNodes(tracks, constraints?.energyTolerance || 10, true, 'gemini')
        }
      } catch (parseError) {
        // Try to fix truncated JSON by finding last complete object
        console.log('[Gemini] JSON parse failed, attempting recovery...')
        const arrayStart = text.indexOf('[')
        if (arrayStart >= 0) {
          // Method 1: Find last complete object ending with },
          const lastCompleteObject = text.lastIndexOf('},')
          if (lastCompleteObject > arrayStart) {
            const recovered = text.substring(arrayStart, lastCompleteObject + 1) + ']'
            try {
              const tracks = JSON.parse(recovered)
              console.log('[Gemini] Recovered', tracks.length, 'tracks (method 1: last },)')
              return await tracksToPlaylistNodes(tracks, constraints?.energyTolerance || 10, true, 'gemini')
            } catch { /* continue to next method */ }
          }

          // Method 2: Find second-to-last complete object (in case last one is partial)
          const secondLastObject = text.lastIndexOf('},', lastCompleteObject - 1)
          if (secondLastObject > arrayStart) {
            const recovered = text.substring(arrayStart, secondLastObject + 1) + ']'
            try {
              const tracks = JSON.parse(recovered)
              console.log('[Gemini] Recovered', tracks.length, 'tracks (method 2: second-to-last)')
              return await tracksToPlaylistNodes(tracks, constraints?.energyTolerance || 10, true, 'gemini')
            } catch { /* continue to next method */ }
          }

          // Method 3: Find last }] pattern
          const lastBracket = text.lastIndexOf('}]')
          if (lastBracket > arrayStart) {
            const recovered = text.substring(arrayStart, lastBracket + 2)
            try {
              const tracks = JSON.parse(recovered)
              console.log('[Gemini] Recovered', tracks.length, 'tracks (method 3: }])')
              return await tracksToPlaylistNodes(tracks, constraints?.energyTolerance || 10, true, 'gemini')
            } catch { /* continue to next method */ }
          }

          // Method 4: Find all complete track objects using regex
          const trackPattern = /\{[^{}]*"title"[^{}]*"artist"[^{}]*\}/g
          const matches = text.match(trackPattern)
          if (matches && matches.length > 0) {
            const recovered = '[' + matches.join(',') + ']'
            try {
              const tracks = JSON.parse(recovered)
              console.log('[Gemini] Recovered', tracks.length, 'tracks (method 4: regex extraction)')
              return await tracksToPlaylistNodes(tracks, constraints?.energyTolerance || 10, true, 'gemini')
            } catch { /* give up */ }
          }
        }
        throw parseError
      }
    }

    console.error('[Gemini] No valid response content:', JSON.stringify(data).substring(0, 500))
    throw new Error('Gemini returned no valid content')
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[Gemini] Request timed out')
      throw new Error('Gemini request timed out - try again or reduce track count')
    }
    console.error('[Gemini] API error:', error)
    throw error
  }
}

async function tracksToPlaylistNodes(tracks: AITrackWithAlternatives[], energyTolerance: number = 10, skipYouTubeForAlternatives: boolean = true, provider: AIProvider = 'openai'): Promise<PlaylistNode[]> {
  // Collect main tracks that need enrichment
  // Skip alternatives to save time on Netlify (can reduce from 24 searches to 8)
  const mainTracksToEnrich: Partial<Track>[] = tracks.map(track => ({
    title: track.title,
    artist: track.artist,
    key: track.key,
    genre: track.genre,
    energy: track.energy,
    duration: track.duration,
    aiReasoning: track.aiReasoning
  }))

  // Enrich main tracks using Invidious/Piped + iTunes (NO YouTube API calls)
  // YouTube API is only used at export time now to save quota
  console.log(`[Generate] Enriching ${mainTracksToEnrich.length} main tracks via Invidious/Piped + iTunes (skipping ${tracks.reduce((acc, t) => acc + (t.alternatives?.length || 0), 0)} alternatives)`)
  const enrichedMainTracks = await enrichTracksWithVideoSearch(mainTracksToEnrich)

  // Build alternatives without YouTube enrichment (they'll get enriched on-demand when swapped)
  const enrichedAlternatives: Map<number, AlternativeTrack[]> = new Map()

  tracks.forEach((track, mainIndex) => {
    if (track.alternatives && track.alternatives.length > 0) {
      enrichedAlternatives.set(mainIndex, track.alternatives.map((alt, altIndex) => ({
        id: `alt-${Date.now()}-${mainIndex}-${altIndex}`,
        youtubeId: '', // Will be fetched on-demand when user swaps
        title: alt.title,
        artist: alt.artist,
        duration: alt.duration || 240,
        key: alt.key,
        genre: alt.genre,
        energy: alt.energy,
        thumbnail: `https://picsum.photos/seed/${Date.now() + mainIndex + altIndex}/200/200`,
        whyNotChosen: alt.whyNotChosen,
        matchScore: alt.matchScore
      })))
    }
  })

  return enrichedMainTracks.map((track, index) => ({
    id: `node-${provider}-${Date.now()}-${index}`,
    track: {
      id: `track-${provider}-${Date.now()}-${index}`,
      youtubeId: track.youtubeId || `yt-${Date.now()}-${index}`,
      title: track.title || 'Unknown Track',
      artist: track.artist || 'Unknown Artist',
      duration: track.duration || 240,
      bpm: tracks[index].bpm,
      key: track.key,
      camelotCode: track.key ? keyToCamelot(track.key) || undefined : undefined,
      genre: track.genre,
      energy: track.energy,
      thumbnail: track.thumbnail || `https://picsum.photos/seed/${Date.now() + index}/200/200`,
      aiReasoning: tracks[index].aiReasoning // Get from original tracks
    },
    position: index,
    sourceProvider: provider, // Tag which AI generated this track
    alternatives: enrichedAlternatives.get(index) || [],
    transitionToNext: index < enrichedMainTracks.length - 1 ? {
      quality: calculateTransitionQuality(track, enrichedMainTracks[index + 1], energyTolerance),
      type: 'blend',
      duration: 16
    } : undefined
  }))
}

function calculateTransitionQuality(track1: Partial<Track>, track2: Partial<Track>, energyTolerance: number = 10): 'excellent' | 'good' | 'fair' | 'poor' {
  if (!track1.energy || !track2.energy) return 'good'

  const energyDiff = Math.abs(track1.energy - track2.energy)

  // Adjust thresholds based on energyTolerance setting (1-100 scale)
  // With strict tolerance (1-5), thresholds are tighter
  // With loose tolerance (15-20), thresholds are more forgiving
  const excellentThreshold = Math.max(5, energyTolerance * 0.5)
  const goodThreshold = Math.max(10, energyTolerance)
  const fairThreshold = Math.max(20, energyTolerance * 1.5)

  if (energyDiff <= excellentThreshold) return 'excellent'
  if (energyDiff <= goodThreshold) return 'good'
  if (energyDiff <= fairThreshold) return 'fair'
  return 'poor'
}

export async function POST(request: NextRequest) {
  // Start timing for Netlify timeout management
  requestStartTime = Date.now()

  try {
    const body: GeneratePlaylistRequest = await request.json()
    const { prompt, constraints, provider = 'openai' } = body

    console.log('[Generate API] Request received:', { provider, prompt: prompt?.substring(0, 50) })
    console.log('[Generate API] Timeout budget:', NETLIFY_SAFE_TIMEOUT, 'ms')
    console.log('[Generate API] Constraints:', JSON.stringify(constraints, null, 2))
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
