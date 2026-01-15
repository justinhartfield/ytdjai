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
  sourceProvider?: AIProvider // Which AI provider generated this track
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
  coverArt?: string // URL or data URI for the arrangement's cover art
  savedToCloud?: boolean // Whether this set has been saved to the cloud
}

// Weighted prompt phrase for multi-phrase blending
export interface WeightedPhrase {
  phrase: string
  weight: number // 0-100, will be normalized
}

// Energy/tempo preset types
export type EnergyPreset = 'no-slow-songs' | 'keep-it-mellow' | 'mid-tempo-groove' | 'bpm-ramp' | 'custom'

// Content rating mode
export type ContentMode = 'clean' | 'explicit-ok' | 'family'

// Length target type - either track count or runtime
export type LengthTarget =
  | { type: 'tracks'; count: 15 | 30 | 60 }
  | { type: 'runtime'; minutes: 45 | 120 }

// Vocal density settings
export interface VocalDensity {
  instrumentalVsVocal: number // 0 = instrumental, 100 = vocal-heavy
  hookyVsAtmospheric: number // 0 = hooky/catchy, 100 = atmospheric
  lyricClarity: number // 0 = clear lyrics, 100 = abstract/buried vocals
}

// Context tokens for enhanced generation
export interface ContextTokens {
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night' | 'late-night'
  season?: 'spring' | 'summer' | 'fall' | 'winter'
  weather?: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy'
  activity?: 'workout' | 'study' | 'work' | 'dinner-party' | 'driving' | 'relaxing' | 'dancing'
  socialContext?: 'solo' | 'friends' | 'date' | 'party' | 'background'
}

// Anchor track (guaranteed include)
export interface AnchorTrack {
  id: string
  title: string
  artist: string
  youtubeId?: string
  thumbnail?: string
}

// Similar playlist reference for hybrid generation
export interface SimilarPlaylistRef {
  url?: string // Spotify/YouTube playlist URL
  modifier?: string // e.g., "but more 'sunrise hope'"
}

// Quick prompt template
export type PromptTemplate =
  | 'make-it-cinematic'
  | 'make-it-danceable'
  | 'make-it-intimate'
  | 'make-it-instrumental'
  | 'make-it-90s-soundtrack'

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

  // === NEW GENERATION CONTROLS ===

  // Multi-phrase blending (Feature 5)
  weightedPhrases?: WeightedPhrase[]

  // Negative prompting (Feature 6)
  avoidConcepts?: string[] // "sad breakup", "country", etc.

  // Length & runtime target (Feature 11)
  lengthTarget?: LengthTarget

  // Energy & tempo presets (Feature 12)
  energyPreset?: EnergyPreset

  // Content mode (Feature 13)
  contentMode?: ContentMode

  // Vocal density (Feature 14)
  vocalDensity?: VocalDensity

  // Anchor tracks (Feature 16)
  anchorTracks?: AnchorTrack[]

  // Similar playlist hybrid (Feature 17)
  similarPlaylist?: SimilarPlaylistRef

  // Context tokens (Feature 10)
  contextTokens?: ContextTokens

  // Paragraph/poem mode (Feature 9) - stores distilled attributes from long text
  longFormInput?: string

  // Applied prompt templates (Feature 7)
  appliedTemplates?: PromptTemplate[]
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
  styleHint?: string // e.g., "more upbeat", "more underground", "more guitars"
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

// Provider alternative - a complete playlist suggestion from another AI
export interface ProviderPlaylist {
  provider: AIProvider
  tracks: PlaylistNode[]
  receivedAt: Date
}

// Generation progress state for parallel AI generation
export interface GenerationProgress {
  isGenerating: boolean
  activeProviders: AIProvider[]
  completedProviders: AIProvider[]
  failedProviders: AIProvider[]
  skeletonCount: number // number of ghost tracks to show
  enrichedCount: number // tracks with YouTube data
  primaryProvider: AIProvider | null
  providerPlaylists: ProviderPlaylist[] // all playlists from all providers
}

// Stream event types (matching backend)
export type StreamEvent =
  | { event: 'started'; providers: AIProvider[] }
  | { event: 'provider-started'; provider: AIProvider }
  | { event: 'primary-result'; provider: AIProvider; tracks: PlaylistNode[] }
  | { event: 'alternative-result'; provider: AIProvider; tracks: PlaylistNode[] }
  | { event: 'provider-failed'; provider: AIProvider; error: string }
  | { event: 'track-enriched'; provider: AIProvider; index: number; track: Partial<Track> }
  | { event: 'complete'; summary: { primary: AIProvider | null; alternatives: AIProvider[]; failed: AIProvider[] } }
  | { event: 'all-failed'; errors: { provider: AIProvider; error: string }[] }
