import { NextRequest, NextResponse } from 'next/server'
import type { AIProvider, GeneratePlaylistRequest, PlaylistNode, Track, AlternativeTrack } from '@/types'

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

// YouTube Data API search
interface YouTubeSearchResult {
  videoId: string
  title: string
  thumbnail: string
  channelTitle: string
  duration?: number
}

// Search YouTube for a video (without fetching duration - that's batched later)
async function searchYouTubeVideo(query: string, apiKey: string): Promise<{ videoId: string; title: string; thumbnail: string } | null> {
  try {
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
    return {
      videoId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url
    }
  } catch (error) {
    console.error('YouTube search error:', error)
    return null
  }
}

// Batch fetch durations for multiple video IDs in a single API call
async function batchFetchDurations(videoIds: string[], apiKey: string): Promise<Map<string, number>> {
  const durations = new Map<string, number>()

  if (videoIds.length === 0) return durations

  try {
    // YouTube API allows up to 50 video IDs per request
    const batchSize = 50
    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batch = videoIds.slice(i, i + batchSize)
      const idsParam = batch.join(',')

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?` +
        `part=contentDetails&id=${idsParam}&key=${apiKey}`
      )

      if (response.ok) {
        const data = await response.json()
        for (const item of data.items || []) {
          if (item.contentDetails?.duration) {
            durations.set(item.id, parseISO8601Duration(item.contentDetails.duration))
          }
        }
      }
    }
  } catch (error) {
    console.error('YouTube batch duration fetch error:', error)
  }

  return durations
}

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 240 // default 4 min

  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)

  return hours * 3600 + minutes * 60 + seconds
}

async function enrichTracksWithYouTube(tracks: Partial<Track>[], fetchDurations: boolean = true): Promise<Partial<Track>[]> {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_AI_API_KEY

  if (!apiKey) {
    console.error('[YouTube] ERROR: No YOUTUBE_API_KEY or GOOGLE_AI_API_KEY environment variable set!')
    return tracks
  }

  // Step 1: Run all searches in parallel (no duration fetch yet)
  console.log(`[YouTube] Searching for ${tracks.length} tracks in parallel...`)
  const searchResults = await Promise.all(
    tracks.map(async (track) => {
      const query = `${track.artist} - ${track.title} official audio`
      const result = await searchYouTubeVideo(query, apiKey)
      return { track, result }
    })
  )

  // Step 2: Collect all video IDs that need duration lookup
  const videoIds = searchResults
    .filter(r => r.result !== null)
    .map(r => r.result!.videoId)

  // Step 3: Batch fetch all durations in ONE API call (instead of N calls)
  let durations = new Map<string, number>()
  if (fetchDurations && videoIds.length > 0) {
    console.log(`[YouTube] Batch fetching durations for ${videoIds.length} videos...`)
    durations = await batchFetchDurations(videoIds, apiKey)
  }

  // Step 4: Merge results
  const enrichedTracks = searchResults.map(({ track, result }) => {
    if (result) {
      console.log(`[YouTube] Found: "${track.artist} - ${track.title}" -> ${result.videoId}`)
      return {
        ...track,
        youtubeId: result.videoId,
        thumbnail: result.thumbnail,
        duration: durations.get(result.videoId) || track.duration || 240
      }
    }

    console.warn(`[YouTube] Not found: "${track.artist} - ${track.title}"`)
    return track
  })

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
            content: `You are a DJ curator. Generate a playlist as a JSON array. Each track object has:
- title, artist, key (e.g. "Am"), genre, energy (1-100 intensity), duration (seconds)
- aiReasoning: 1 sentence on why it fits the theme
- alternatives: array of 2 objects with title, artist, key, genre, energy, duration, whyNotChosen (1 sentence), matchScore (70-95)

Energy scale: 1-20 chill, 21-40 groovy, 41-60 moderate, 61-80 driving, 81-100 peak.
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

    const data = await response.json()

    if (data.choices?.[0]?.message?.content) {
      let content = data.choices[0].message.content
      console.log('[OpenAI] Raw response:', content.substring(0, 200))

      // Try to parse JSON, handle truncated responses
      try {
        const tracks = JSON.parse(content)
        console.log('[OpenAI] Parsed', tracks.length, 'tracks')
        return await tracksToPlaylistNodes(tracks, constraints?.energyTolerance || 10)
      } catch (parseError) {
        // Try to fix truncated JSON by finding last complete object
        console.log('[OpenAI] JSON parse failed, attempting recovery...')
        const lastCompleteArray = content.lastIndexOf('}]')
        if (lastCompleteArray > 0) {
          content = content.substring(0, lastCompleteArray + 2)
          const tracks = JSON.parse(content)
          console.log('[OpenAI] Recovered', tracks.length, 'tracks from truncated response')
          return await tracksToPlaylistNodes(tracks, constraints?.energyTolerance || 10)
        }
        throw parseError
      }
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

  const constraintInstructions = buildConstraintInstructions(constraints)

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
            - Energy range: ${constraints?.energyRange?.min || 40}-${constraints?.energyRange?.max || 80} (1-100 scale)
            - Moods: ${constraints?.moods?.join(', ') || 'varied'}

${constraintInstructions ? `CURATION CONSTRAINTS (follow these carefully):\n${constraintInstructions}` : ''}

            Return ONLY a JSON array of track objects with these fields:
            - title: string (track name)
            - artist: string (artist name)
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
              - title, artist, key, genre, energy, duration (same fields as main track)
              - whyNotChosen: string (1 sentence explaining why this wasn't the primary pick but is still a great alternative)
              - matchScore: number (70-95, how well this alternative fits the slot)

            Consider transitions - adjacent tracks should have compatible energy levels and keys.
            Each track's aiReasoning MUST explicitly reference the user's theme to explain why it was selected.
            The alternatives should be genuinely good options that almost made the cut - similar style, compatible energy/key.`
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
        return await tracksToPlaylistNodes(tracks, constraints?.energyTolerance || 10)
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

  const constraintInstructions = buildConstraintInstructions(constraints)

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
                  - Energy range: ${constraints?.energyRange?.min || 40}-${constraints?.energyRange?.max || 80} (1-100 scale)
                  - Moods: ${constraints?.moods?.join(', ') || 'varied'}

${constraintInstructions ? `CURATION CONSTRAINTS (follow these carefully):\n${constraintInstructions}` : ''}

                  Return ONLY a JSON array of track objects with these fields:
                  - title: string (track name)
                  - artist: string (artist name)
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
                    - title, artist, key, genre, energy, duration (same fields as main track)
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
        return await tracksToPlaylistNodes(tracks, constraints?.energyTolerance || 10)
      }
    }

    console.error('[Gemini] No valid response content:', data)
    throw new Error('Gemini returned no valid content')
  } catch (error) {
    console.error('[Gemini] API error:', error)
    throw error
  }
}

async function tracksToPlaylistNodes(tracks: AITrackWithAlternatives[], energyTolerance: number = 10): Promise<PlaylistNode[]> {
  // Collect all tracks that need YouTube enrichment (main tracks + alternatives)
  const allTracksToEnrich: Partial<Track>[] = []
  const trackIndexMap: { mainIndex: number; altIndex?: number }[] = []

  tracks.forEach((track, mainIndex) => {
    // Add main track
    allTracksToEnrich.push(track)
    trackIndexMap.push({ mainIndex })

    // Add alternatives
    if (track.alternatives) {
      track.alternatives.forEach((alt, altIndex) => {
        allTracksToEnrich.push(alt)
        trackIndexMap.push({ mainIndex, altIndex })
      })
    }
  })

  // Enrich all tracks with YouTube data in parallel
  console.log(`[Generate] Enriching ${allTracksToEnrich.length} tracks with YouTube data (${tracks.length} main + alternatives)`)
  const enrichedTracks = await enrichTracksWithYouTube(allTracksToEnrich)

  // Rebuild the structure with enriched data
  const enrichedMain: (Partial<Track> & { alternatives?: AITrackWithAlternatives['alternatives'] })[] = tracks.map(() => ({}))
  const enrichedAlternatives: Map<number, AlternativeTrack[]> = new Map()

  enrichedTracks.forEach((enriched, i) => {
    const mapping = trackIndexMap[i]
    if (mapping.altIndex === undefined) {
      // This is a main track
      enrichedMain[mapping.mainIndex] = { ...tracks[mapping.mainIndex], ...enriched }
    } else {
      // This is an alternative
      if (!enrichedAlternatives.has(mapping.mainIndex)) {
        enrichedAlternatives.set(mapping.mainIndex, [])
      }
      const originalAlt = tracks[mapping.mainIndex].alternatives?.[mapping.altIndex]
      enrichedAlternatives.get(mapping.mainIndex)!.push({
        id: `alt-${Date.now()}-${mapping.mainIndex}-${mapping.altIndex}`,
        youtubeId: enriched.youtubeId || `yt-alt-${Date.now()}-${mapping.mainIndex}-${mapping.altIndex}`,
        title: enriched.title || originalAlt?.title || 'Unknown Track',
        artist: enriched.artist || originalAlt?.artist || 'Unknown Artist',
        duration: enriched.duration || originalAlt?.duration || 240,
        key: enriched.key || originalAlt?.key,
        genre: enriched.genre || originalAlt?.genre,
        energy: enriched.energy || originalAlt?.energy,
        thumbnail: enriched.thumbnail || `https://picsum.photos/seed/${Date.now() + mapping.mainIndex + mapping.altIndex}/200/200`,
        whyNotChosen: originalAlt?.whyNotChosen,
        matchScore: originalAlt?.matchScore
      })
    }
  })

  return enrichedMain.map((track, index) => ({
    id: `node-${Date.now()}-${index}`,
    track: {
      id: `track-${Date.now()}-${index}`,
      youtubeId: track.youtubeId || `yt-${Date.now()}-${index}`,
      title: track.title || 'Unknown Track',
      artist: track.artist || 'Unknown Artist',
      duration: track.duration || 240,
      key: track.key,
      genre: track.genre,
      energy: track.energy,
      thumbnail: track.thumbnail || `https://picsum.photos/seed/${Date.now() + index}/200/200`,
      aiReasoning: track.aiReasoning
    },
    position: index,
    alternatives: enrichedAlternatives.get(index) || [],
    transitionToNext: index < enrichedMain.length - 1 ? {
      quality: calculateTransitionQuality(track, enrichedMain[index + 1], energyTolerance),
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
  try {
    const body: GeneratePlaylistRequest = await request.json()
    const { prompt, constraints, provider = 'openai' } = body

    console.log('[Generate API] Request received:', { provider, prompt: prompt?.substring(0, 50) })
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
