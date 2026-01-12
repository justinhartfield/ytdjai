import { NextRequest, NextResponse } from 'next/server'
import type { AIProvider, SwapTrackRequest, Track } from '@/types'

// Alternative tracks database for swapping
const ALTERNATIVE_TRACKS: Track[] = [
  {
    id: 'alt-1',
    youtubeId: 'alt-yt-1',
    title: 'One More Time',
    artist: 'Daft Punk',
    duration: 320,
    bpm: 122,
    key: 'A♭ major',
    genre: 'French House',
    energy: 0.85,
    thumbnail: 'https://picsum.photos/seed/alt1/200/200'
  },
  {
    id: 'alt-2',
    youtubeId: 'alt-yt-2',
    title: 'Satisfaction',
    artist: 'Benny Benassi',
    duration: 280,
    bpm: 130,
    key: 'F minor',
    genre: 'Electro House',
    energy: 0.9,
    thumbnail: 'https://picsum.photos/seed/alt2/200/200'
  },
  {
    id: 'alt-3',
    youtubeId: 'alt-yt-3',
    title: 'Around the World',
    artist: 'Daft Punk',
    duration: 420,
    bpm: 121,
    key: 'G minor',
    genre: 'French House',
    energy: 0.8,
    thumbnail: 'https://picsum.photos/seed/alt3/200/200'
  },
  {
    id: 'alt-4',
    youtubeId: 'alt-yt-4',
    title: 'Children',
    artist: 'Robert Miles',
    duration: 360,
    bpm: 138,
    key: 'B minor',
    genre: 'Dream Trance',
    energy: 0.7,
    thumbnail: 'https://picsum.photos/seed/alt4/200/200'
  },
  {
    id: 'alt-5',
    youtubeId: 'alt-yt-5',
    title: 'Sandstorm',
    artist: 'Darude',
    duration: 230,
    bpm: 136,
    key: 'B minor',
    genre: 'Trance',
    energy: 0.95,
    thumbnail: 'https://picsum.photos/seed/alt5/200/200'
  },
  {
    id: 'alt-6',
    youtubeId: 'alt-yt-6',
    title: 'Finally',
    artist: 'CeCe Peniston',
    duration: 280,
    bpm: 124,
    key: 'A♭ major',
    genre: 'House',
    energy: 0.85,
    thumbnail: 'https://picsum.photos/seed/alt6/200/200'
  },
  {
    id: 'alt-7',
    youtubeId: 'alt-yt-7',
    title: 'Show Me Love',
    artist: 'Robin S',
    duration: 320,
    bpm: 122,
    key: 'C minor',
    genre: 'House',
    energy: 0.8,
    thumbnail: 'https://picsum.photos/seed/alt7/200/200'
  },
  {
    id: 'alt-8',
    youtubeId: 'alt-yt-8',
    title: 'Blue (Da Ba Dee)',
    artist: 'Eiffel 65',
    duration: 270,
    bpm: 128,
    key: 'E minor',
    genre: 'Eurodance',
    energy: 0.85,
    thumbnail: 'https://picsum.photos/seed/alt8/200/200'
  }
]

async function findAlternativeWithAI(
  currentTrack: Track,
  previousTrack?: Track,
  nextTrack?: Track,
  provider: AIProvider = 'openai'
): Promise<Track> {
  // Calculate ideal BPM based on surrounding tracks
  let targetBpm = currentTrack.bpm || 128
  if (previousTrack?.bpm && nextTrack?.bpm) {
    targetBpm = Math.round((previousTrack.bpm + nextTrack.bpm) / 2)
  } else if (previousTrack?.bpm) {
    targetBpm = previousTrack.bpm + 2
  } else if (nextTrack?.bpm) {
    targetBpm = nextTrack.bpm - 2
  }

  // Find best matching alternative
  const scoredTracks = ALTERNATIVE_TRACKS
    .filter(t => t.id !== currentTrack.id)
    .map(track => {
      let score = 0

      // BPM compatibility (most important)
      if (track.bpm) {
        const bpmDiff = Math.abs(track.bpm - targetBpm)
        score += Math.max(0, 30 - bpmDiff * 3)
      }

      // Energy similarity
      if (track.energy && currentTrack.energy) {
        const energyDiff = Math.abs(track.energy - currentTrack.energy)
        score += Math.max(0, 20 - energyDiff * 20)
      }

      // Genre variety bonus (slightly different genre is good)
      if (track.genre !== currentTrack.genre) {
        score += 10
      }

      return { track, score }
    })
    .sort((a, b) => b.score - a.score)

  // Return the best match with updated ID
  const bestMatch = scoredTracks[0]?.track || ALTERNATIVE_TRACKS[0]

  return {
    ...bestMatch,
    id: `track-${Date.now()}`,
    youtubeId: `yt-${Date.now()}`
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SwapTrackRequest = await request.json()
    const { currentTrack, previousTrack, nextTrack, constraints, provider = 'openai' } = body

    if (!currentTrack) {
      return NextResponse.json(
        { success: false, error: 'Current track is required' },
        { status: 400 }
      )
    }

    const newTrack = await findAlternativeWithAI(
      currentTrack,
      previousTrack,
      nextTrack,
      provider
    )

    // Calculate transition quality to adjacent tracks
    let transitionQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'good'
    if (previousTrack?.bpm && newTrack.bpm) {
      const bpmDiff = Math.abs(previousTrack.bpm - newTrack.bpm)
      if (bpmDiff <= 3) transitionQuality = 'excellent'
      else if (bpmDiff <= 6) transitionQuality = 'good'
      else if (bpmDiff <= 10) transitionQuality = 'fair'
      else transitionQuality = 'poor'
    }

    return NextResponse.json({
      success: true,
      newTrack,
      transitionQuality,
      reasoning: `Selected "${newTrack.title}" by ${newTrack.artist} (${newTrack.bpm} BPM) as an alternative that maintains flow with surrounding tracks.`,
      metadata: {
        provider,
        generatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Swap track error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to find alternative track' },
      { status: 500 }
    )
  }
}
