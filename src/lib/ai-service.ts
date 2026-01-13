import type {
  AIProvider,
  Track,
  GeneratePlaylistRequest,
  SwapTrackRequest,
  AIConstraints,
  PlaylistNode
} from '@/types'

interface GenerateResponse {
  success: boolean
  playlist?: PlaylistNode[]
  error?: string
  metadata?: {
    provider: AIProvider
    generatedAt: string
    trackCount: number
    totalDuration: number
  }
}

interface SwapResponse {
  success: boolean
  newTrack?: Track
  transitionQuality?: 'excellent' | 'good' | 'fair' | 'poor'
  reasoning?: string
  error?: string
}

/**
 * Generate a playlist using AI
 */
export async function generatePlaylist(request: GeneratePlaylistRequest): Promise<GenerateResponse> {
  try {
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Generate playlist error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate playlist'
    }
  }
}

/**
 * Swap a track with an AI-recommended alternative
 */
export async function swapTrack(request: SwapTrackRequest): Promise<SwapResponse> {
  try {
    const response = await fetch('/api/ai/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Swap track error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to swap track'
    }
  }
}

/**
 * Mock track database for demo/fallback purposes
 * Using real YouTube video IDs for actual playback
 */
export const MOCK_TRACKS: Track[] = [
  {
    id: '1',
    youtubeId: 'tKi9Z-f6qX4',  // deadmau5 - Strobe
    title: 'Strobe',
    artist: 'deadmau5',
    duration: 637,
    bpm: 128,
    key: 'F minor',
    genre: 'Progressive House',
    energy: 0.7,
    thumbnail: 'https://i.ytimg.com/vi/tKi9Z-f6qX4/hqdefault.jpg'
  },
  {
    id: '2',
    youtubeId: 'iRA82xLsb_w',  // Eric Prydz - Opus
    title: 'Opus',
    artist: 'Eric Prydz',
    duration: 540,
    bpm: 126,
    key: 'A minor',
    genre: 'Progressive House',
    energy: 0.8,
    thumbnail: 'https://i.ytimg.com/vi/iRA82xLsb_w/hqdefault.jpg'
  },
  {
    id: '3',
    youtubeId: 'ckDFjYcBzoc',  // Oliver Heldens - Gecko (Overdrive)
    title: 'Gecko (Overdrive)',
    artist: 'Oliver Heldens',
    duration: 210,
    bpm: 125,
    key: 'G minor',
    genre: 'Future House',
    energy: 0.85,
    thumbnail: 'https://i.ytimg.com/vi/ckDFjYcBzoc/hqdefault.jpg'
  },
  {
    id: '4',
    youtubeId: 'P8JEm4d6Wu4',  // Faithless - Insomnia
    title: 'Insomnia',
    artist: 'Faithless',
    duration: 420,
    bpm: 130,
    key: 'D minor',
    genre: 'Trance',
    energy: 0.9,
    thumbnail: 'https://i.ytimg.com/vi/P8JEm4d6Wu4/hqdefault.jpg'
  },
  {
    id: '5',
    youtubeId: '2EaE0_gQLw0',  // Tiësto - Adagio for Strings
    title: 'Adagio for Strings',
    artist: 'Tiësto',
    duration: 480,
    bpm: 138,
    key: 'B♭ minor',
    genre: 'Trance',
    energy: 0.95,
    thumbnail: 'https://i.ytimg.com/vi/2EaE0_gQLw0/hqdefault.jpg'
  },
  {
    id: '6',
    youtubeId: 'QV8eiSA4vqc',  // deadmau5 - Ghosts n Stuff
    title: 'Ghosts n Stuff',
    artist: 'deadmau5 ft. Rob Swire',
    duration: 360,
    bpm: 127,
    key: 'E minor',
    genre: 'Electro House',
    energy: 0.8,
    thumbnail: 'https://i.ytimg.com/vi/QV8eiSA4vqc/hqdefault.jpg'
  },
  {
    id: '7',
    youtubeId: '_ovdm2yX4MA',  // Avicii - Levels
    title: 'Levels',
    artist: 'Avicii',
    duration: 210,
    bpm: 126,
    key: 'F♯ minor',
    genre: 'Progressive House',
    energy: 0.9,
    thumbnail: 'https://i.ytimg.com/vi/_ovdm2yX4MA/hqdefault.jpg'
  },
  {
    id: '8',
    youtubeId: 'OOmRyyHhui8',  // Energy 52 - Cafe Del Mar
    title: 'Cafe Del Mar',
    artist: 'Energy 52',
    duration: 450,
    bpm: 132,
    key: 'C minor',
    genre: 'Trance',
    energy: 0.75,
    thumbnail: 'https://i.ytimg.com/vi/OOmRyyHhui8/hqdefault.jpg'
  }
]

/**
 * Generate a mock playlist for demo purposes
 */
export function generateMockPlaylist(trackCount: number): PlaylistNode[] {
  const shuffled = [...MOCK_TRACKS].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, Math.min(trackCount, MOCK_TRACKS.length))

  return selected.map((track, index) => ({
    id: `node-${Date.now()}-${index}`,
    track: { ...track, id: `track-${Date.now()}-${index}` },
    position: index,
    transitionToNext: index < selected.length - 1 ? {
      quality: calculateTransitionQuality(track, selected[index + 1]),
      type: 'blend' as const,
      duration: 16
    } : undefined
  }))
}

/**
 * Calculate transition quality between two tracks
 */
export function calculateTransitionQuality(
  track1: Track,
  track2: Track
): 'excellent' | 'good' | 'fair' | 'poor' {
  if (!track1.bpm || !track2.bpm) return 'good'

  const bpmDiff = Math.abs(track1.bpm - track2.bpm)

  if (bpmDiff <= 3) return 'excellent'
  if (bpmDiff <= 6) return 'good'
  if (bpmDiff <= 10) return 'fair'
  return 'poor'
}
