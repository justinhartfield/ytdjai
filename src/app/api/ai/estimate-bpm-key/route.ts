import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const maxDuration = 30 // 30 second timeout

interface TrackInput {
  title: string
  artist: string
  genre?: string
}

interface BpmKeyEstimate {
  bpm: number
  key: string
  confidence: number
}

// OpenAI client (primary provider for estimation)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// System prompt for BPM/key estimation
const SYSTEM_PROMPT = `You are a music metadata analyst specializing in electronic and dance music.
Your task is to estimate the BPM (beats per minute) and musical key for tracks based on their title, artist, and genre.

Consider these genre conventions:
- House: 118-135 BPM (typical 125)
- Deep House: 118-128 BPM (typical 122)
- Tech House: 122-130 BPM (typical 126)
- Techno: 125-150 BPM (typical 130)
- Melodic Techno: 118-128 BPM (typical 122)
- Trance: 125-150 BPM (typical 138)
- Progressive House: 122-132 BPM (typical 128)
- Drum and Bass: 160-180 BPM (typical 174)
- Dubstep: 138-150 BPM (typical 140)
- Hip Hop: 80-115 BPM (typical 90)
- Trap: 130-170 BPM (typical 140)
- R&B: 60-100 BPM (typical 80)
- Pop: 90-130 BPM (typical 110)
- Rock: 100-140 BPM (typical 120)
- EDM: 118-150 BPM (typical 128)

For musical keys, use standard notation: C, C#, D, D#, E, F, F#, G, G#, A, A#, B for major keys
Add 'm' suffix for minor keys: Cm, C#m, Dm, etc.

Consider:
1. Artist's typical style and production preferences
2. Genre conventions
3. Track title cues (e.g., "slow" suggests lower BPM, "anthem" suggests higher energy)
4. Common key preferences for different genres (house often in Am, Em; techno in Am, Dm)

If you're uncertain, provide your best estimate with a lower confidence score.`

const USER_PROMPT_TEMPLATE = `Estimate the BPM and musical key for these tracks. Respond ONLY with a valid JSON array, no other text.

Tracks:
{{TRACKS}}

Response format (JSON array, one object per track in same order):
[
  {"bpm": 125, "key": "Am", "confidence": 0.8},
  {"bpm": 128, "key": "Dm", "confidence": 0.7}
]

Confidence should be 0.0-1.0 where:
- 0.9-1.0: Very confident (well-known artist/genre with consistent style)
- 0.7-0.9: Confident (genre typical, reasonable estimate)
- 0.5-0.7: Moderate (uncertain, using genre defaults)
- Below 0.5: Low confidence (unusual or unknown context)`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const tracks: TrackInput[] = body.tracks

    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: tracks array required' },
        { status: 400 }
      )
    }

    // Limit batch size to 20 tracks
    const limitedTracks = tracks.slice(0, 20)

    // Format tracks for prompt
    const trackList = limitedTracks
      .map((t, i) => `${i + 1}. "${t.artist} - ${t.title}"${t.genre ? ` [Genre: ${t.genre}]` : ''}`)
      .join('\n')

    const userPrompt = USER_PROMPT_TEMPLATE.replace('{{TRACKS}}', trackList)

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent estimates
      max_tokens: 1000,
    })

    const responseText = completion.choices[0]?.message?.content?.trim()

    if (!responseText) {
      return NextResponse.json(
        { success: false, error: 'Empty AI response' },
        { status: 500 }
      )
    }

    // Parse JSON response
    let estimates: BpmKeyEstimate[]
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      estimates = JSON.parse(cleanedResponse)

      if (!Array.isArray(estimates)) {
        throw new Error('Response is not an array')
      }
    } catch (parseError) {
      console.error('[BPM/Key] Failed to parse AI response:', responseText)
      return NextResponse.json(
        { success: false, error: 'Failed to parse AI response' },
        { status: 500 }
      )
    }

    // Validate and normalize estimates
    const validatedEstimates: BpmKeyEstimate[] = estimates.map((est, index) => {
      // Ensure BPM is in valid range
      const bpm = typeof est.bpm === 'number' ? Math.max(60, Math.min(200, Math.round(est.bpm))) : 120

      // Ensure key is valid format
      const key = normalizeKey(est.key) || 'Am'

      // Ensure confidence is valid
      const confidence =
        typeof est.confidence === 'number' ? Math.max(0, Math.min(1, est.confidence)) : 0.5

      return { bpm, key, confidence }
    })

    // If AI returned fewer estimates than tracks, pad with defaults
    while (validatedEstimates.length < limitedTracks.length) {
      validatedEstimates.push({
        bpm: 120,
        key: 'Am',
        confidence: 0.3,
      })
    }

    return NextResponse.json({
      success: true,
      estimates: validatedEstimates,
    })
  } catch (error) {
    console.error('[BPM/Key] Estimation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Estimation failed',
      },
      { status: 500 }
    )
  }
}

/**
 * Normalize key to standard format
 */
function normalizeKey(key: unknown): string | null {
  if (typeof key !== 'string') return null

  let cleaned = key.trim()

  // Handle lowercase
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  // Handle variations
  cleaned = cleaned
    .replace(/\s*sharp/i, '#')
    .replace(/\s*flat/i, 'b')
    .replace(/\s*minor/i, 'm')
    .replace(/\s*min$/i, 'm')
    .replace(/\s*maj$/i, '')
    .replace(/\s*major/i, '')
    .replace(/\s+/g, '')

  // Validate format (basic check)
  const validKeys = [
    'C',
    'C#',
    'Db',
    'D',
    'D#',
    'Eb',
    'E',
    'F',
    'F#',
    'Gb',
    'G',
    'G#',
    'Ab',
    'A',
    'A#',
    'Bb',
    'B',
    'Cm',
    'C#m',
    'Dbm',
    'Dm',
    'D#m',
    'Ebm',
    'Em',
    'Fm',
    'F#m',
    'Gbm',
    'Gm',
    'G#m',
    'Abm',
    'Am',
    'A#m',
    'Bbm',
    'Bm',
  ]

  if (validKeys.includes(cleaned)) {
    return cleaned
  }

  return null
}
