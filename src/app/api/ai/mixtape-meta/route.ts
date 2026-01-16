import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { GeneratedMixtapeMeta, CoverTemplateId } from '@/types'

interface MixtapeMetaRequest {
  prompt?: string
  tracks: { title: string; artist: string; energy?: number; genre?: string }[]
  arcTemplate?: string
  duration: number // Total duration in seconds
  contextTokens?: {
    timeOfDay?: string
    activity?: string
    mood?: string
  }
}

// Map genres/moods to cover templates
const GENRE_TO_TEMPLATE: Record<string, CoverTemplateId> = {
  'synthwave': 'neon-gradient',
  'cyberpunk': 'neon-gradient',
  'electronic': 'circuit-tech',
  'techno': 'glitch-digital',
  'house': 'geometric-bold',
  'lofi': 'paper-texture',
  'jazz': 'vinyl-classic',
  'classical': 'minimal-wave',
  'rock': 'dark-abstract',
  'indie': 'paper-texture',
  'pop': 'sunset-gradient',
  'hip-hop': 'geometric-bold',
  'r&b': 'holographic',
  'soul': 'vinyl-classic',
  'ambient': 'minimal-wave',
  'chill': 'sunset-gradient',
  'workout': 'geometric-bold',
  'focus': 'minimal-wave',
  'party': 'neon-gradient',
  'driving': 'circuit-tech',
  'nature': 'nature-organic',
}

function suggestCoverTemplate(
  prompt: string,
  genres: string[],
  activity?: string
): CoverTemplateId {
  const promptLower = prompt.toLowerCase()
  const allText = `${promptLower} ${genres.join(' ')} ${activity || ''}`.toLowerCase()

  // Check for keywords
  for (const [keyword, template] of Object.entries(GENRE_TO_TEMPLATE)) {
    if (allText.includes(keyword)) {
      return template
    }
  }

  // Default based on energy/vibe keywords
  if (allText.includes('night') || allText.includes('dark')) return 'dark-abstract'
  if (allText.includes('retro') || allText.includes('80s') || allText.includes('vintage')) return 'vintage-cassette'
  if (allText.includes('minimal') || allText.includes('clean')) return 'minimal-wave'
  if (allText.includes('energy') || allText.includes('intense')) return 'glitch-digital'
  if (allText.includes('chill') || allText.includes('relax')) return 'sunset-gradient'

  return 'neon-gradient' // Default
}

function extractTags(
  prompt: string,
  tracks: MixtapeMetaRequest['tracks'],
  activity?: string
): string[] {
  const tags: Set<string> = new Set()

  // Extract genres from tracks
  tracks.forEach(track => {
    if (track.genre) {
      tags.add(track.genre.toLowerCase())
    }
  })

  // Add activity as tag
  if (activity) {
    tags.add(activity.toLowerCase().replace('-', ' '))
  }

  // Extract keywords from prompt
  const keywords = ['workout', 'focus', 'party', 'chill', 'driving', 'coding', 'study',
    'morning', 'night', 'summer', 'winter', 'dance', 'relax', 'energy', 'vibes']

  keywords.forEach(kw => {
    if (prompt.toLowerCase().includes(kw)) {
      tags.add(kw)
    }
  })

  return Array.from(tags).slice(0, 5) // Max 5 tags
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body: MixtapeMetaRequest = await request.json()
    const { prompt = '', tracks, arcTemplate, duration, contextTokens } = body

    if (!tracks || tracks.length === 0) {
      return NextResponse.json({ error: 'Tracks are required' }, { status: 400 })
    }

    // Build context for AI
    const trackList = tracks.slice(0, 10).map(t => `${t.artist} - ${t.title}`).join('\n')
    const genres = tracks.map(t => t.genre).filter(Boolean) as string[]
    const avgEnergy = tracks.reduce((sum, t) => sum + (t.energy || 50), 0) / tracks.length
    const durationMin = Math.round(duration / 60)

    // Determine energy vibe
    let energyVibe = 'moderate'
    if (avgEnergy > 75) energyVibe = 'high-energy'
    else if (avgEnergy > 60) energyVibe = 'upbeat'
    else if (avgEnergy < 40) energyVibe = 'chill'
    else if (avgEnergy < 25) energyVibe = 'ambient'

    // Use OpenAI for title/subtitle generation
    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      // Fallback to simple generation without AI
      const fallbackMeta: GeneratedMixtapeMeta = {
        title: prompt.slice(0, 50) || 'Untitled Mix',
        subtitle: `${tracks.length} tracks, ${durationMin} minutes of ${energyVibe} vibes`,
        description: `A curated ${durationMin}-minute mix featuring ${tracks[0]?.artist || 'various artists'} and more.`,
        suggestedCoverTemplate: suggestCoverTemplate(prompt, genres, contextTokens?.activity),
        tags: extractTags(prompt, tracks, contextTokens?.activity),
      }
      return NextResponse.json(fallbackMeta)
    }

    const systemPrompt = `You are a creative mixtape/playlist naming expert. Generate catchy, memorable names for DJ mixes and playlists.

Style guidelines:
- Titles should be evocative and memorable (2-5 words max)
- Subtitles should be punchy and describe the vibe (under 60 chars)
- Think like a music curator or DJ naming their set
- Use creative metaphors, imagery, and wordplay
- Match the energy and mood of the tracks

Examples of good titles:
- "Neon Night Drive Vol. 1"
- "Sunset Sessions"
- "Midnight Coding Fuel"
- "Dawn Patrol Mix"
- "Electric Dreams"
- "The Deep End"

Examples of good subtitles:
- "Synthwave fuel for your 2AM coding session"
- "Low-key vibes for Sunday morning coffee"
- "Peak hour energy for the main room"
- "Driving music for empty highways"`

    const userPrompt = `Generate a title, subtitle, and description for this mixtape:

Original prompt: "${prompt || 'No prompt provided'}"
Arc template: ${arcTemplate || 'Standard'}
Duration: ${durationMin} minutes
Track count: ${tracks.length}
Average energy: ${energyVibe} (${Math.round(avgEnergy)}/100)
Context: ${contextTokens?.activity || 'general listening'}${contextTokens?.timeOfDay ? `, ${contextTokens.timeOfDay}` : ''}

Sample tracks:
${trackList}

Genres detected: ${genres.slice(0, 5).join(', ') || 'mixed'}

Respond in JSON format:
{
  "title": "Creative title (2-5 words)",
  "subtitle": "Punchy tagline under 60 chars",
  "description": "2-3 sentence description of the mix and why it works"
}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.9, // Higher creativity
        max_tokens: 300,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      console.error('[MixtapeMeta] OpenAI error:', response.status)
      // Fallback
      const fallbackMeta: GeneratedMixtapeMeta = {
        title: prompt.slice(0, 50) || 'Untitled Mix',
        subtitle: `${tracks.length} tracks, ${durationMin} minutes of ${energyVibe} vibes`,
        description: `A curated ${durationMin}-minute mix featuring ${tracks[0]?.artist || 'various artists'} and more.`,
        suggestedCoverTemplate: suggestCoverTemplate(prompt, genres, contextTokens?.activity),
        tags: extractTags(prompt, tracks, contextTokens?.activity),
      }
      return NextResponse.json(fallbackMeta)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No content in response')
    }

    const parsed = JSON.parse(content)

    const result: GeneratedMixtapeMeta = {
      title: parsed.title || 'Untitled Mix',
      subtitle: parsed.subtitle || `${tracks.length} tracks of ${energyVibe} vibes`,
      description: parsed.description || `A curated ${durationMin}-minute mix.`,
      suggestedCoverTemplate: suggestCoverTemplate(prompt, genres, contextTokens?.activity),
      tags: extractTags(prompt, tracks, contextTokens?.activity),
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[MixtapeMeta] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate mixtape metadata' },
      { status: 500 }
    )
  }
}
