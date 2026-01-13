// YTDJ.AI Type Definitions

export type AIProvider = 'openai' | 'claude' | 'gemini'

export type Mood =
  | 'energetic'
  | 'chill'
  | 'dark'
  | 'uplifting'
  | 'melancholic'
  | 'aggressive'
  | 'romantic'
  | 'psychedelic'

export type TransitionQuality = 'excellent' | 'good' | 'fair' | 'poor'

export interface Track {
  id: string
  youtubeId: string
  title: string
  artist: string
  duration: number // in seconds
  thumbnail?: string
  genres?: string[]
  genre?: string
  energy?: number // 1-100 subjective intensity (NOT tempo)
  key?: string
  isExplicit?: boolean
  aiReasoning?: string
}

export interface Transition {
  quality: TransitionQuality
  type: 'cut' | 'blend' | 'fade'
  duration: number // in beats
}

export interface AlternativeTrack extends Track {
  whyNotChosen?: string // AI explanation of why this wasn't the primary choice but is a good alternative
  matchScore?: number // 0-100 compatibility score
}

export interface PlaylistNode {
  id: string
  track: Track
  position: number // X-axis position (order)
  targetEnergy?: number // Y-axis position (1-100)
  isLocked?: boolean
  isEnergyLocked?: boolean
  state?: NodeState
  transitionToNext?: Transition
  startTime?: number // Start playback at this time (in seconds) - useful for skipping intros
  alternatives?: AlternativeTrack[] // Alternative tracks that could work in this slot
}

export type NodeState =
  | 'ai-selected'
  | 'user-locked'
  | 'energy-locked'
  | 'playing'
  | 'previewing'
  | 'unresolved'
  | 'unavailable'
  | 'loading'

export interface TransitionQualityDetail {
  from: string
  to: string
  score: 'smooth' | 'ok' | 'jarring'
  energyDelta: number
  keyCompatible?: boolean
}

export interface ArcTemplate {
  id: string
  name: string
  description: string
  svgPath: string
  energyProfile: number[] // Array of Energy values (1-100) at each position
}

export interface Set {
  id: string
  name: string
  prompt?: string
  arcTemplate?: string
  nodes?: PlaylistNode[]
  playlist: PlaylistNode[]
  constraints?: AIConstraints
  createdAt: Date
  updatedAt: Date
  isExported?: boolean
  youtubePlaylistId?: string
}

export interface AIConstraints {
  energyTolerance?: number // 1-20 - how strict energy matching should be
  novelty?: number // 0-100 (familiar to deep cuts) - maps to discovery
  artistDiversity?: number // 0-100 - how much variety in artists
  genreDiversity?: number // 0-100
  decadeSpread?: number // 0-100
  avoidArtists?: string[]
  avoidGenres?: string[]
  avoidExplicit?: boolean
  // New fields for prompt panel
  trackCount?: number
  transitionQualityThreshold?: number
  moods?: Mood[]
  excludeArtists?: string[]
  energyRange?: { min: number; max: number } // 1-100 scale
  // Extended constraints from AI Settings panel
  syncopation?: number // 0-100 - beat complexity preference
  keyMatch?: 'strict' | 'loose' // how strict key matching should be
  activeDecades?: string[] // which decades to include ('80s', '90s', '00s', '10s', '20s')
  discovery?: number // 0-100 - chart hits (0) to underground (100)
  blacklist?: string[] // artists/genres to exclude
}

export interface GeneratePlaylistRequest {
  prompt: string
  arcTemplate?: string
  duration?: number
  trackCount?: number
  constraints?: AIConstraints
  provider: AIProvider
}

export interface SwapTrackRequest {
  currentTrack: Track
  previousTrack?: Track
  nextTrack?: Track
  targetEnergy?: number
  constraints?: AIConstraints
  provider: AIProvider
}

export interface AIResponse<T> {
  data: T
  provider: AIProvider
  reasoning?: string
  confidence?: number
}

export interface ExportSettings {
  name: string
  description: string
  visibility: 'private' | 'unlisted' | 'public'
  destination: 'youtube-music' | 'youtube'
}

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  googleAccessToken?: string
  googleRefreshToken?: string
}
