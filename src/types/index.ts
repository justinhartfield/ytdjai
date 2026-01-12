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
  bpm?: number
  thumbnail?: string
  genres?: string[]
  genre?: string
  energy?: number // 0-1
  key?: string
  isExplicit?: boolean
  aiReasoning?: string[]
}

export interface Transition {
  quality: TransitionQuality
  type: 'cut' | 'blend' | 'fade'
  duration: number // in beats
}

export interface PlaylistNode {
  id: string
  track: Track
  position: number // X-axis position (order)
  targetBpm?: number // Y-axis position
  isLocked?: boolean
  isBpmLocked?: boolean
  state?: NodeState
  transitionToNext?: Transition
}

export type NodeState =
  | 'ai-selected'
  | 'user-locked'
  | 'bpm-locked'
  | 'playing'
  | 'previewing'
  | 'unresolved'
  | 'unavailable'
  | 'loading'

export interface TransitionQualityDetail {
  from: string
  to: string
  score: 'smooth' | 'ok' | 'jarring'
  bpmDelta: number
  energyDelta?: number
  keyCompatible?: boolean
}

export interface ArcTemplate {
  id: string
  name: string
  description: string
  svgPath: string
  bpmProfile: number[] // Array of BPM values at each position
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
  bpmTolerance?: number // 1-20
  novelty?: number // 0-100 (familiar to deep cuts)
  artistDiversity?: number // 0-100
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
  bpmRange?: { min: number; max: number }
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
