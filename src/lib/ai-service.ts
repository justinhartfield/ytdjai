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
 */
export const MOCK_TRACKS: Track[] = [
  {
    id: '1',
    youtubeId: 'dQw4w9WgXcQ',
    title: 'Strobe',
    artist: 'deadmau5',
    duration: 637,
    bpm: 128,
    key: 'F minor',
    genre: 'Progressive House',
    energy: 0.7,
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
  },
  {
    id: '2',
    youtubeId: 'abc123',
    title: 'Opus',
    artist: 'Eric Prydz',
    duration: 540,
    bpm: 126,
    key: 'A minor',
    genre: 'Progressive House',
    energy: 0.8,
    thumbnail: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg'
  },
  {
    id: '3',
    youtubeId: 'def456',
    title: 'Gecko (Overdrive)',
    artist: 'Oliver Heldens',
    duration: 210,
    bpm: 125,
    key: 'G minor',
    genre: 'Future House',
    energy: 0.85,
    thumbnail: 'https://i.ytimg.com/vi/def456/hqdefault.jpg'
  },
  {
    id: '4',
    youtubeId: 'ghi789',
    title: 'Insomnia',
    artist: 'Faithless',
    duration: 420,
    bpm: 130,
    key: 'D minor',
    genre: 'Trance',
    energy: 0.9,
    thumbnail: 'https://i.ytimg.com/vi/ghi789/hqdefault.jpg'
  },
  {
    id: '5',
    youtubeId: 'jkl012',
    title: 'Adagio for Strings',
    artist: 'Tiësto',
    duration: 480,
    bpm: 138,
    key: 'B♭ minor',
    genre: 'Trance',
    energy: 0.95,
    thumbnail: 'https://i.ytimg.com/vi/jkl012/hqdefault.jpg'
  },
  {
    id: '6',
    youtubeId: 'mno345',
    title: 'Ghosts n Stuff',
    artist: 'deadmau5 ft. Rob Swire',
    duration: 360,
    bpm: 127,
    key: 'E minor',
    genre: 'Electro House',
    energy: 0.8,
    thumbnail: 'https://i.ytimg.com/vi/mno345/hqdefault.jpg'
  },
  {
    id: '7',
    youtubeId: 'pqr678',
    title: 'Levels',
    artist: 'Avicii',
    duration: 210,
    bpm: 126,
    key: 'F♯ minor',
    genre: 'Progressive House',
    energy: 0.9,
    thumbnail: 'https://i.ytimg.com/vi/pqr678/hqdefault.jpg'
  },
  {
    id: '8',
    youtubeId: 'stu901',
    title: 'Cafe Del Mar',
    artist: 'Energy 52',
    duration: 450,
    bpm: 132,
    key: 'C minor',
    genre: 'Trance',
    energy: 0.75,
    thumbnail: 'https://i.ytimg.com/vi/stu901/hqdefault.jpg'
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
