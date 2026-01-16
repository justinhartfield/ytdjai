'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AIProvider,
  Set,
  PlaylistNode,
  Track,
  AIConstraints,
  ArcTemplate,
  User,
  NodeState,
  WeightedPhrase,
  EnergyPreset,
  ContentMode,
  LengthTarget,
  VocalDensity,
  ContextTokens,
  AnchorTrack,
  SimilarPlaylistRef,
  PromptTemplate,
  GenerationProgress,
  ProviderPlaylist,
  SetSegment,
  SegmentConstraints,
  SegmentPreset,
  AutoMixState,
  DualPlayerState,
} from '@/types'
import { SEGMENT_PRESETS } from '@/types'

// Player State
interface PlayerState {
  currentVideoId: string | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  playingNodeIndex: number | null
  startTime: number // Start time for current track (for skipping intros)
}

// UI State
interface UIState {
  leftSidebarPanel: 'arrangement' | 'constraints' | 'sets' | null
  showExportModal: boolean
}

// Extended AI Constraints (matching ai_engine_constraints.html)
interface ExtendedConstraints {
  energyTolerance: number
  syncopation: number
  keyMatch: 'strict' | 'loose'
  diversity: number
  activeDecades: string[]
  discovery: number
  blacklist: string[]
}

// Generation Controls State (new advanced features)
interface GenerationControls {
  // Multi-phrase blending (Feature 5)
  weightedPhrases: WeightedPhrase[]

  // Negative prompting (Feature 6)
  avoidConcepts: string[]

  // Length & runtime target (Feature 11)
  lengthTarget: LengthTarget

  // Energy & tempo presets (Feature 12)
  energyPreset: EnergyPreset

  // Content mode (Feature 13)
  contentMode: ContentMode

  // Vocal density (Feature 14)
  vocalDensity: VocalDensity

  // Anchor tracks (Feature 16)
  anchorTracks: AnchorTrack[]

  // Similar playlist hybrid (Feature 17)
  similarPlaylist: SimilarPlaylistRef | null

  // Context tokens (Feature 10)
  contextTokens: ContextTokens

  // Paragraph/poem mode (Feature 9)
  longFormInput: string

  // Applied prompt templates (Feature 7)
  appliedTemplates: PromptTemplate[]

  // Emoji support flag (Feature 8) - parsed from prompt automatically
  emojiVibesEnabled: boolean
}

// Subscription State
interface SubscriptionState {
  tier: 'free' | 'pro'
  creditsRemaining: number
  creditsResetAt: string | null
  isLoadingSubscription: boolean
  limits: {
    monthlyCredits: number
    maxCloudSaves: number | null
    allowedProviders: string[]
    hasWizardPro: boolean
    hasSegmentedSets: boolean
  }
}

// YTDJ Store Interface (simplified for main app)
interface YTDJState {
  // Subscription
  subscription: SubscriptionState
  fetchSubscription: () => Promise<void>
  refreshCredits: () => Promise<void>
  decrementLocalCredits: () => void

  // AI Provider
  aiProvider: AIProvider
  setAIProvider: (provider: AIProvider) => void

  // Current Set
  currentSet: Set | null
  setCurrentSet: (set: Set | null) => void

  // All Sets
  sets: Set[]
  addSet: (set: Set) => void
  updateSet: (id: string, updates: Partial<Set>) => void
  deleteSet: (id: string) => void

  // Playlist
  updatePlaylist: (playlist: PlaylistNode[]) => void
  updateSetWithPrompt: (playlist: PlaylistNode[], prompt: string) => void
  updatePrompt: (prompt: string) => void
  updateNodeStartTime: (nodeIndex: number, startTime: number) => void
  updateCoverArt: (coverArt: string | undefined) => void

  // Player State
  player: PlayerState
  setPlayerState: (state: Partial<PlayerState>) => void
  playTrack: (nodeIndex: number) => void
  pauseTrack: () => void
  stopTrack: () => void
  skipNext: () => void
  skipPrevious: () => void

  // UI State
  ui: UIState
  setLeftSidebarPanel: (panel: 'arrangement' | 'constraints' | 'sets' | null) => void
  setShowExportModal: (show: boolean) => void

  // Extended Constraints
  constraints: ExtendedConstraints
  setConstraints: (constraints: Partial<ExtendedConstraints>) => void
  addToBlacklist: (item: string) => void
  removeFromBlacklist: (index: number) => void
  toggleDecade: (decade: string) => void

  // Loading States
  isGenerating: boolean
  setIsGenerating: (loading: boolean) => void

  // Generation Error State
  generationError: {
    message: string
    code?: 'auth_required' | 'no_credits' | 'rate_limited' | 'server_error'
    tier?: string
  } | null
  setGenerationError: (error: { message: string; code?: 'auth_required' | 'no_credits' | 'rate_limited' | 'server_error'; tier?: string } | null) => void
  clearGenerationError: () => void

  // History (Undo/Redo)
  history: Set[]
  historyIndex: number
  pushHistory: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // Active Arc Template
  activeArcTemplate: string
  setActiveArcTemplate: (templateId: string) => void

  // Generation Controls (new advanced features)
  generationControls: GenerationControls
  setGenerationControls: (updates: Partial<GenerationControls>) => void
  addWeightedPhrase: (phrase: WeightedPhrase) => void
  removeWeightedPhrase: (index: number) => void
  updateWeightedPhrase: (index: number, updates: Partial<WeightedPhrase>) => void
  addAvoidConcept: (concept: string) => void
  removeAvoidConcept: (index: number) => void
  addAnchorTrack: (track: AnchorTrack) => void
  removeAnchorTrack: (id: string) => void
  togglePromptTemplate: (template: PromptTemplate) => void
  setContextToken: <K extends keyof ContextTokens>(key: K, value: ContextTokens[K]) => void
  clearContextToken: (key: keyof ContextTokens) => void
  setVocalDensity: (key: keyof VocalDensity, value: number) => void
  setSimilarPlaylist: (playlist: SimilarPlaylistRef | null) => void
  setLongFormInput: (text: string) => void

  // Initialize
  initializeStore: () => void

  // Generation Progress (parallel AI streaming)
  generationProgress: GenerationProgress
  startParallelGeneration: (trackCount: number) => void
  setProviderStarted: (provider: AIProvider) => void
  receivePrimaryResult: (provider: AIProvider, tracks: PlaylistNode[]) => void
  receiveAlternativeResult: (provider: AIProvider, tracks: PlaylistNode[]) => void
  setProviderFailed: (provider: AIProvider, error: string) => void
  enrichTrack: (provider: AIProvider, index: number, track: Partial<Track>) => void
  completeGeneration: (summary: { primary: AIProvider | null; alternatives: AIProvider[]; failed: AIProvider[] }) => void
  failAllGeneration: (errors: { provider: AIProvider; error: string }[]) => void
  resetGenerationProgress: () => void
  swapWithProviderAlternative: (provider: AIProvider) => void
  combineAllProviders: () => void

  // Segmented Set Designer (Pro feature)
  segments: SetSegment[]
  activeSegmentId: string | null
  isRegeneratingSegment: string | null
  setSegments: (segments: SetSegment[]) => void
  addSegment: (segment: SetSegment) => void
  updateSegment: (id: string, updates: Partial<SetSegment>) => void
  removeSegment: (id: string) => void
  reorderSegments: (fromIndex: number, toIndex: number) => void
  setActiveSegment: (id: string | null) => void
  calculateSegmentBoundaries: () => void
  getTracksForSegment: (segmentId: string) => PlaylistNode[]
  applySegmentPreset: (segmentId: string, preset: SegmentPreset) => void
  initializeDefaultSegments: () => void
  setIsRegeneratingSegment: (id: string | null) => void
  enableSegmentedMode: () => void
  disableSegmentedMode: () => void

  // Cloud Sync
  saveSetToCloud: (setId?: string) => Promise<{ success: boolean; error?: string }>
  loadSetFromCloud: (setId: string) => Promise<{ success: boolean; error?: string }>
  listCloudSets: () => Promise<{ success: boolean; sets?: any[]; error?: string }>
  deleteSetFromCloud: (setId: string) => Promise<{ success: boolean; error?: string }>
  isSyncing: boolean
  setSyncing: (syncing: boolean) => void

  // AutoMix State
  autoMix: AutoMixState
  setAutoMixEnabled: (enabled: boolean) => void
  setAutoMixMode: (mode: 'seamless' | 'gapped') => void
  setAutoMixCrossfadeDuration: (seconds: number) => void

  // Dual Player State (for AutoMix crossfade)
  dualPlayer: DualPlayerState
  setDualPlayerState: (state: Partial<DualPlayerState>) => void
  resetDualPlayer: () => void

  // Track BPM/Key enrichment
  enrichTrackBpmKey: (nodeIndex: number, bpm: number, key: string, camelotCode?: string) => void
  batchEnrichBpmKey: (updates: Array<{ nodeIndex: number; bpm: number; key: string; camelotCode?: string }>) => void
}

export const useYTDJStore = create<YTDJState>()(
  persist(
    (set, get) => ({
      // Subscription
      subscription: {
        tier: 'free',
        creditsRemaining: 5,
        creditsResetAt: null,
        isLoadingSubscription: false,
        limits: {
          monthlyCredits: 5,
          maxCloudSaves: 3,
          allowedProviders: ['openai'],
          hasWizardPro: false,
          hasSegmentedSets: false,
        },
      },
      fetchSubscription: async () => {
        set((state) => ({
          subscription: { ...state.subscription, isLoadingSubscription: true },
        }))
        try {
          const response = await fetch('/api/user/subscription')
          if (response.ok) {
            const data = await response.json()
            set((state) => ({
              subscription: {
                tier: data.tier,
                creditsRemaining: data.creditsRemaining,
                creditsResetAt: data.creditsResetAt,
                isLoadingSubscription: false,
                limits: {
                  monthlyCredits: data.limits.monthlyCredits,
                  maxCloudSaves: data.limits.maxCloudSaves,
                  allowedProviders: data.limits.allowedProviders,
                  hasWizardPro: data.limits.hasWizardPro,
                  hasSegmentedSets: data.limits.hasSegmentedSets ?? false,
                },
              },
            }))
          } else {
            set((state) => ({
              subscription: { ...state.subscription, isLoadingSubscription: false },
            }))
          }
        } catch (error) {
          console.error('Failed to fetch subscription:', error)
          set((state) => ({
            subscription: { ...state.subscription, isLoadingSubscription: false },
          }))
        }
      },
      refreshCredits: async () => {
        try {
          const response = await fetch('/api/user/subscription')
          if (response.ok) {
            const data = await response.json()
            set((state) => ({
              subscription: {
                ...state.subscription,
                creditsRemaining: data.creditsRemaining,
              },
            }))
          }
        } catch (error) {
          console.error('Failed to refresh credits:', error)
        }
      },
      decrementLocalCredits: () => {
        set((state) => ({
          subscription: {
            ...state.subscription,
            creditsRemaining: Math.max(0, state.subscription.creditsRemaining - 1),
          },
        }))
      },

      // AI Provider
      aiProvider: 'openai',
      setAIProvider: (provider) => set({ aiProvider: provider }),

      // Current Set
      currentSet: null,
      setCurrentSet: (currentSet) => set({ currentSet }),

      // All Sets
      sets: [],
      addSet: (newSet) => set((state) => ({ sets: [...state.sets, newSet] })),
      updateSet: (id, updates) => set((state) => ({
        sets: state.sets.map((s) => s.id === id ? { ...s, ...updates } : s),
        currentSet: state.currentSet?.id === id
          ? { ...state.currentSet, ...updates }
          : state.currentSet,
      })),
      deleteSet: (id) => set((state) => ({
        sets: state.sets.filter((s) => s.id !== id),
        currentSet: state.currentSet?.id === id ? null : state.currentSet,
      })),

      // Playlist
      updatePlaylist: (playlist) => {
        // Push current state to history before making changes
        const state = get()
        if (state.currentSet) {
          const newHistory = state.history.slice(0, state.historyIndex + 1)
          const snapshot = JSON.parse(JSON.stringify(state.currentSet))
          set({
            history: [...newHistory, snapshot],
            historyIndex: state.historyIndex + 1,
          })
        }

        set((state) => {
          const currentSet = state.currentSet || {
            id: `set-${Date.now()}`,
            name: 'Untitled Set',
            playlist: [],
            createdAt: new Date(),
            updatedAt: new Date()
          }
          return {
            currentSet: { ...currentSet, playlist, updatedAt: new Date() }
          }
        })
      },
      updateSetWithPrompt: (playlist, prompt) => {
        // Push current state to history before making changes
        const state = get()
        if (state.currentSet) {
          const newHistory = state.history.slice(0, state.historyIndex + 1)
          const snapshot = JSON.parse(JSON.stringify(state.currentSet))
          set({
            history: [...newHistory, snapshot],
            historyIndex: state.historyIndex + 1,
          })
        }

        set((state) => {
          const currentSet = state.currentSet || {
            id: `set-${Date.now()}`,
            name: 'Untitled Set',
            playlist: [],
            createdAt: new Date(),
            updatedAt: new Date()
          }
          return {
            currentSet: { ...currentSet, playlist, prompt, updatedAt: new Date() }
          }
        })
      },
      updatePrompt: (prompt) => set((state) => {
        if (!state.currentSet) return state
        return {
          currentSet: { ...state.currentSet, prompt, updatedAt: new Date() }
        }
      }),
      updateCoverArt: (coverArt) => set((state) => {
        if (!state.currentSet) return state
        return {
          currentSet: { ...state.currentSet, coverArt, updatedAt: new Date() }
        }
      }),
      updateNodeStartTime: (nodeIndex, startTime) => set((state) => {
        if (!state.currentSet) return state
        const playlist = [...state.currentSet.playlist]
        if (nodeIndex < 0 || nodeIndex >= playlist.length) return state
        playlist[nodeIndex] = { ...playlist[nodeIndex], startTime }
        return {
          currentSet: { ...state.currentSet, playlist, updatedAt: new Date() }
        }
      }),

      // Player State
      player: {
        currentVideoId: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 80,
        playingNodeIndex: null,
        startTime: 0
      },
      setPlayerState: (playerUpdates) => set((state) => ({
        player: { ...state.player, ...playerUpdates }
      })),
      playTrack: (nodeIndex) => set((state) => {
        const playlist = state.currentSet?.playlist || []
        const node = playlist[nodeIndex]
        if (!node?.track?.youtubeId) return state
        const startTime = node.startTime || 0
        return {
          player: {
            ...state.player,
            currentVideoId: node.track.youtubeId,
            isPlaying: true,
            playingNodeIndex: nodeIndex,
            currentTime: startTime,
            startTime
          }
        }
      }),
      pauseTrack: () => set((state) => ({
        player: { ...state.player, isPlaying: false }
      })),
      stopTrack: () => set((state) => ({
        player: {
          ...state.player,
          isPlaying: false,
          currentTime: 0,
          currentVideoId: null,
          playingNodeIndex: null
        }
      })),
      skipNext: () => set((state) => {
        const playlist = state.currentSet?.playlist || []
        const currentIndex = state.player.playingNodeIndex
        if (currentIndex === null || currentIndex >= playlist.length - 1) return state
        const nextIndex = currentIndex + 1
        const nextNode = playlist[nextIndex]
        if (!nextNode?.track?.youtubeId) return state
        const startTime = nextNode.startTime || 0
        return {
          player: {
            ...state.player,
            currentVideoId: nextNode.track.youtubeId,
            isPlaying: true,
            playingNodeIndex: nextIndex,
            currentTime: startTime,
            startTime
          }
        }
      }),
      skipPrevious: () => set((state) => {
        const playlist = state.currentSet?.playlist || []
        const currentIndex = state.player.playingNodeIndex
        if (currentIndex === null || currentIndex <= 0) return state
        const prevIndex = currentIndex - 1
        const prevNode = playlist[prevIndex]
        if (!prevNode?.track?.youtubeId) return state
        const startTime = prevNode.startTime || 0
        return {
          player: {
            ...state.player,
            currentVideoId: prevNode.track.youtubeId,
            isPlaying: true,
            playingNodeIndex: prevIndex,
            currentTime: startTime,
            startTime
          }
        }
      }),

      // UI State
      ui: {
        leftSidebarPanel: 'arrangement',
        showExportModal: false
      },
      setLeftSidebarPanel: (panel) => set((state) => ({
        ui: { ...state.ui, leftSidebarPanel: panel }
      })),
      setShowExportModal: (show) => set((state) => ({
        ui: { ...state.ui, showExportModal: show }
      })),

      // Extended Constraints
      constraints: {
        energyTolerance: 10,
        syncopation: 50,
        keyMatch: 'loose',
        diversity: 70,
        activeDecades: ['80s', '90s', '00s', '10s', '20s'],
        discovery: 30,
        blacklist: []
      },
      setConstraints: (constraintUpdates) => set((state) => ({
        constraints: { ...state.constraints, ...constraintUpdates }
      })),
      addToBlacklist: (item) => set((state) => ({
        constraints: {
          ...state.constraints,
          blacklist: [...state.constraints.blacklist, item]
        }
      })),
      removeFromBlacklist: (index) => set((state) => ({
        constraints: {
          ...state.constraints,
          blacklist: state.constraints.blacklist.filter((_, i) => i !== index)
        }
      })),
      toggleDecade: (decade) => set((state) => {
        const activeDecades = state.constraints.activeDecades
        const isActive = activeDecades.includes(decade)
        return {
          constraints: {
            ...state.constraints,
            activeDecades: isActive
              ? activeDecades.filter(d => d !== decade)
              : [...activeDecades, decade]
          }
        }
      }),

      // Loading States
      isGenerating: false,
      setIsGenerating: (loading) => set({ isGenerating: loading }),

      // Generation Error State
      generationError: null,
      setGenerationError: (error) => set({ generationError: error }),
      clearGenerationError: () => set({ generationError: null }),

      // History (Undo/Redo)
      history: [],
      historyIndex: -1,
      pushHistory: () => set((state) => {
        if (!state.currentSet) return state
        // Slice history to current index (discard any redo states)
        const newHistory = state.history.slice(0, state.historyIndex + 1)
        // Deep clone the current set
        const snapshot = JSON.parse(JSON.stringify(state.currentSet))
        return {
          history: [...newHistory, snapshot],
          historyIndex: state.historyIndex + 1,
        }
      }),
      undo: () => set((state) => {
        if (state.historyIndex <= 0) return state
        const newIndex = state.historyIndex - 1
        const previousSet = state.history[newIndex]
        return {
          currentSet: JSON.parse(JSON.stringify(previousSet)),
          historyIndex: newIndex,
        }
      }),
      redo: () => set((state) => {
        if (state.historyIndex >= state.history.length - 1) return state
        const newIndex = state.historyIndex + 1
        const nextSet = state.history[newIndex]
        return {
          currentSet: JSON.parse(JSON.stringify(nextSet)),
          historyIndex: newIndex,
        }
      }),
      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().history.length - 1,

      // Active Arc Template
      activeArcTemplate: 'mountain',
      setActiveArcTemplate: (templateId) => set({ activeArcTemplate: templateId }),

      // Generation Controls (new advanced features)
      generationControls: {
        weightedPhrases: [],
        avoidConcepts: [],
        lengthTarget: { type: 'runtime', minutes: 45 },
        energyPreset: 'custom',
        contentMode: 'explicit-ok',
        vocalDensity: {
          instrumentalVsVocal: 50,
          hookyVsAtmospheric: 50,
          lyricClarity: 50
        },
        anchorTracks: [],
        similarPlaylist: null,
        contextTokens: {},
        longFormInput: '',
        appliedTemplates: [],
        emojiVibesEnabled: true
      },
      setGenerationControls: (updates) => set((state) => ({
        generationControls: { ...state.generationControls, ...updates }
      })),
      addWeightedPhrase: (phrase) => set((state) => ({
        generationControls: {
          ...state.generationControls,
          weightedPhrases: [...state.generationControls.weightedPhrases, phrase]
        }
      })),
      removeWeightedPhrase: (index) => set((state) => ({
        generationControls: {
          ...state.generationControls,
          weightedPhrases: state.generationControls.weightedPhrases.filter((_, i) => i !== index)
        }
      })),
      updateWeightedPhrase: (index, updates) => set((state) => ({
        generationControls: {
          ...state.generationControls,
          weightedPhrases: state.generationControls.weightedPhrases.map((p, i) =>
            i === index ? { ...p, ...updates } : p
          )
        }
      })),
      addAvoidConcept: (concept) => set((state) => ({
        generationControls: {
          ...state.generationControls,
          avoidConcepts: [...state.generationControls.avoidConcepts, concept]
        }
      })),
      removeAvoidConcept: (index) => set((state) => ({
        generationControls: {
          ...state.generationControls,
          avoidConcepts: state.generationControls.avoidConcepts.filter((_, i) => i !== index)
        }
      })),
      addAnchorTrack: (track) => set((state) => ({
        generationControls: {
          ...state.generationControls,
          anchorTracks: state.generationControls.anchorTracks.length < 5
            ? [...state.generationControls.anchorTracks, track]
            : state.generationControls.anchorTracks
        }
      })),
      removeAnchorTrack: (id) => set((state) => ({
        generationControls: {
          ...state.generationControls,
          anchorTracks: state.generationControls.anchorTracks.filter((t) => t.id !== id)
        }
      })),
      togglePromptTemplate: (template) => set((state) => {
        const templates = state.generationControls.appliedTemplates
        const isActive = templates.includes(template)
        return {
          generationControls: {
            ...state.generationControls,
            appliedTemplates: isActive
              ? templates.filter(t => t !== template)
              : [...templates, template]
          }
        }
      }),
      setContextToken: (key, value) => set((state) => ({
        generationControls: {
          ...state.generationControls,
          contextTokens: { ...state.generationControls.contextTokens, [key]: value }
        }
      })),
      clearContextToken: (key) => set((state) => {
        const { [key]: _, ...rest } = state.generationControls.contextTokens
        return {
          generationControls: {
            ...state.generationControls,
            contextTokens: rest
          }
        }
      }),
      setVocalDensity: (key, value) => set((state) => ({
        generationControls: {
          ...state.generationControls,
          vocalDensity: { ...state.generationControls.vocalDensity, [key]: value }
        }
      })),
      setSimilarPlaylist: (playlist) => set((state) => ({
        generationControls: {
          ...state.generationControls,
          similarPlaylist: playlist
        }
      })),
      setLongFormInput: (text) => set((state) => ({
        generationControls: {
          ...state.generationControls,
          longFormInput: text
        }
      })),

      // Initialize
      initializeStore: () => {
        const state = get()
        if (!state.currentSet) {
          set({
            currentSet: {
              id: `set-${Date.now()}`,
              name: 'New Set',
              playlist: [],
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
        }
      },

      // Generation Progress (parallel AI streaming)
      generationProgress: {
        isGenerating: false,
        activeProviders: [],
        completedProviders: [],
        failedProviders: [],
        skeletonCount: 0,
        enrichedCount: 0,
        primaryProvider: null,
        providerPlaylists: []
      },

      startParallelGeneration: (trackCount) => set((state) => ({
        generationProgress: {
          ...state.generationProgress,
          isGenerating: true,
          activeProviders: ['openai', 'claude', 'gemini'],
          completedProviders: [],
          failedProviders: [],
          skeletonCount: trackCount,
          enrichedCount: 0,
          primaryProvider: null,
          providerPlaylists: []
        },
        isGenerating: true
      })),

      setProviderStarted: (provider) => set((state) => ({
        generationProgress: {
          ...state.generationProgress,
          activeProviders: state.generationProgress.activeProviders.includes(provider)
            ? state.generationProgress.activeProviders
            : [...state.generationProgress.activeProviders, provider]
        }
      })),

      receivePrimaryResult: (provider, tracks) => set((state) => {
        // Update playlist with primary result
        const currentSet = state.currentSet || {
          id: `set-${Date.now()}`,
          name: 'Untitled Set',
          playlist: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }

        return {
          generationProgress: {
            ...state.generationProgress,
            primaryProvider: provider,
            completedProviders: [...state.generationProgress.completedProviders, provider],
            activeProviders: state.generationProgress.activeProviders.filter(p => p !== provider),
            providerPlaylists: [
              ...state.generationProgress.providerPlaylists,
              { provider, tracks, receivedAt: new Date() }
            ]
          },
          currentSet: {
            ...currentSet,
            playlist: tracks,
            updatedAt: new Date()
          }
        }
      }),

      receiveAlternativeResult: (provider, tracks) => set((state) => ({
        generationProgress: {
          ...state.generationProgress,
          completedProviders: [...state.generationProgress.completedProviders, provider],
          activeProviders: state.generationProgress.activeProviders.filter(p => p !== provider),
          providerPlaylists: [
            ...state.generationProgress.providerPlaylists,
            { provider, tracks, receivedAt: new Date() }
          ]
        }
      })),

      setProviderFailed: (provider, error) => set((state) => ({
        generationProgress: {
          ...state.generationProgress,
          failedProviders: [...state.generationProgress.failedProviders, provider],
          activeProviders: state.generationProgress.activeProviders.filter(p => p !== provider)
        }
      })),

      enrichTrack: (provider, index, trackUpdate) => set((state) => {
        // Only update if this is the primary provider
        if (state.generationProgress.primaryProvider !== provider) return state
        if (!state.currentSet) return state

        const playlist = [...state.currentSet.playlist]
        if (index >= 0 && index < playlist.length) {
          playlist[index] = {
            ...playlist[index],
            track: {
              ...playlist[index].track,
              ...trackUpdate
            }
          }
        }

        return {
          generationProgress: {
            ...state.generationProgress,
            enrichedCount: state.generationProgress.enrichedCount + 1
          },
          currentSet: {
            ...state.currentSet,
            playlist
          }
        }
      }),

      completeGeneration: (summary) => set((state) => ({
        generationProgress: {
          ...state.generationProgress,
          isGenerating: false,
          activeProviders: []
        },
        isGenerating: false
      })),

      failAllGeneration: (errors) => set((state) => ({
        generationProgress: {
          ...state.generationProgress,
          isGenerating: false,
          activeProviders: [],
          failedProviders: errors.map(e => e.provider)
        },
        isGenerating: false
      })),

      resetGenerationProgress: () => set((state) => ({
        generationProgress: {
          isGenerating: false,
          activeProviders: [],
          completedProviders: [],
          failedProviders: [],
          skeletonCount: 0,
          enrichedCount: 0,
          primaryProvider: null,
          providerPlaylists: []
        }
      })),

      // Swap entire playlist with an alternative provider's result
      swapWithProviderAlternative: (provider) => set((state) => {
        const alternativePlaylist = state.generationProgress.providerPlaylists.find(p => p.provider === provider)
        if (!alternativePlaylist || !state.currentSet) return state

        return {
          currentSet: {
            ...state.currentSet,
            playlist: alternativePlaylist.tracks,
            updatedAt: new Date()
          },
          generationProgress: {
            ...state.generationProgress,
            primaryProvider: provider
          }
        }
      }),

      // Combine tracks from all providers into one playlist
      combineAllProviders: () => set((state) => {
        const { providerPlaylists } = state.generationProgress
        if (providerPlaylists.length < 2 || !state.currentSet) return state

        // Collect all tracks from all providers
        const allTracks: PlaylistNode[] = []
        const providerOrder: AIProvider[] = ['openai', 'claude', 'gemini']

        // Sort playlists by provider order for consistency
        const sortedPlaylists = [...providerPlaylists].sort((a, b) => {
          return providerOrder.indexOf(a.provider) - providerOrder.indexOf(b.provider)
        })

        // Interleave tracks from each provider to create variety
        // Round-robin: take 1 track from each provider in sequence
        const maxTracks = Math.max(...sortedPlaylists.map(p => p.tracks.length))

        for (let i = 0; i < maxTracks; i++) {
          for (const playlist of sortedPlaylists) {
            if (i < playlist.tracks.length) {
              const track = playlist.tracks[i]
              // Ensure sourceProvider is set
              allTracks.push({
                ...track,
                id: `combined-${Date.now()}-${allTracks.length}`,
                position: allTracks.length,
                sourceProvider: playlist.provider
              })
            }
          }
        }

        // Apply the active arc template's energy curve to combined tracks
        const activeTemplate = arcTemplates.find(t => t.id === state.activeArcTemplate)
        if (activeTemplate && allTracks.length > 0 && activeTemplate.energyProfile.length > 0) {
          const profile = activeTemplate.energyProfile
          // Map each track to the energy curve by interpolating the profile
          allTracks.forEach((node, index) => {
            const progress = index / (allTracks.length - 1 || 1)
            // Interpolate from energyProfile array
            const profileIndex = progress * (profile.length - 1)
            const lowerIndex = Math.floor(profileIndex)
            const upperIndex = Math.min(lowerIndex + 1, profile.length - 1)
            const fraction = profileIndex - lowerIndex
            const targetEnergy = profile[lowerIndex] + (profile[upperIndex] - profile[lowerIndex]) * fraction
            // Update track energy to match template
            node.track = {
              ...node.track,
              energy: Math.round(targetEnergy)
            }
          })
        }

        return {
          currentSet: {
            ...state.currentSet,
            playlist: allTracks,
            updatedAt: new Date()
          },
          generationProgress: {
            ...state.generationProgress,
            primaryProvider: null // null indicates combined mode
          }
        }
      }),

      // Segmented Set Designer (Pro feature)
      segments: [],
      activeSegmentId: null,
      isRegeneratingSegment: null,

      setSegments: (segments) => set({ segments }),

      addSegment: (segment) => set((state) => ({
        segments: [...state.segments, segment].map((s, i) => ({ ...s, order: i })),
        currentSet: state.currentSet
          ? { ...state.currentSet, segments: [...state.segments, segment].map((s, i) => ({ ...s, order: i })), isSegmented: true }
          : state.currentSet
      })),

      updateSegment: (id, updates) => set((state) => ({
        segments: state.segments.map((s) => s.id === id ? { ...s, ...updates } : s),
        currentSet: state.currentSet
          ? { ...state.currentSet, segments: state.segments.map((s) => s.id === id ? { ...s, ...updates } : s) }
          : state.currentSet
      })),

      removeSegment: (id) => set((state) => {
        const newSegments = state.segments.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i }))
        return {
          segments: newSegments,
          activeSegmentId: state.activeSegmentId === id ? null : state.activeSegmentId,
          currentSet: state.currentSet
            ? { ...state.currentSet, segments: newSegments, isSegmented: newSegments.length > 0 }
            : state.currentSet
        }
      }),

      reorderSegments: (fromIndex, toIndex) => set((state) => {
        const newSegments = [...state.segments]
        const [moved] = newSegments.splice(fromIndex, 1)
        newSegments.splice(toIndex, 0, moved)
        const reordered = newSegments.map((s, i) => ({ ...s, order: i }))
        return {
          segments: reordered,
          currentSet: state.currentSet
            ? { ...state.currentSet, segments: reordered }
            : state.currentSet
        }
      }),

      setActiveSegment: (id) => set({ activeSegmentId: id }),

      setIsRegeneratingSegment: (id) => set({ isRegeneratingSegment: id }),

      calculateSegmentBoundaries: () => {
        const state = get()
        if (!state.segments.length || !state.currentSet?.playlist.length) return

        const playlist = state.currentSet.playlist
        const totalTracks = playlist.length

        let currentIndex = 0
        const updatedSegments = state.segments.map((segment) => {
          const startIndex = currentIndex
          let endIndex: number

          if (segment.duration.type === 'tracks') {
            endIndex = Math.min(startIndex + segment.duration.count - 1, totalTracks - 1)
          } else {
            // Duration in minutes - find tracks that fit within the time
            let segmentDuration = 0
            const targetDuration = segment.duration.duration * 60 // convert to seconds
            endIndex = startIndex

            while (endIndex < totalTracks && segmentDuration < targetDuration) {
              segmentDuration += playlist[endIndex].track.duration
              if (segmentDuration <= targetDuration || endIndex === startIndex) {
                endIndex++
              } else {
                break
              }
            }
            endIndex = Math.max(startIndex, endIndex - 1)
          }

          currentIndex = endIndex + 1
          return { ...segment, startIndex, endIndex }
        })

        set({
          segments: updatedSegments,
          currentSet: state.currentSet
            ? { ...state.currentSet, segments: updatedSegments }
            : state.currentSet
        })
      },

      getTracksForSegment: (segmentId) => {
        const state = get()
        const segment = state.segments.find((s) => s.id === segmentId)
        if (!segment || segment.startIndex === undefined || segment.endIndex === undefined) {
          return []
        }
        return state.currentSet?.playlist.slice(segment.startIndex, segment.endIndex + 1) || []
      },

      applySegmentPreset: (segmentId, preset) => set((state) => {
        const presetConfig = SEGMENT_PRESETS[preset]
        if (!presetConfig) return state

        return {
          segments: state.segments.map((s) =>
            s.id === segmentId
              ? {
                  ...s,
                  name: presetConfig.name,
                  color: presetConfig.suggestedColor,
                  duration: presetConfig.defaultDuration,
                  constraints: { ...s.constraints, ...presetConfig.defaultConstraints }
                }
              : s
          ),
          currentSet: state.currentSet
            ? {
                ...state.currentSet,
                segments: state.segments.map((s) =>
                  s.id === segmentId
                    ? {
                        ...s,
                        name: presetConfig.name,
                        color: presetConfig.suggestedColor,
                        duration: presetConfig.defaultDuration,
                        constraints: { ...s.constraints, ...presetConfig.defaultConstraints }
                      }
                    : s
                )
              }
            : state.currentSet
        }
      }),

      initializeDefaultSegments: () => set((state) => {
        const defaultSegments: SetSegment[] = [
          {
            id: `segment-${Date.now()}-warmup`,
            name: 'Warmup',
            color: '#3B82F6',
            duration: { type: 'minutes', duration: 15 },
            order: 0,
            constraints: { energyRange: { min: 30, max: 55 }, discovery: 40 }
          },
          {
            id: `segment-${Date.now()}-build`,
            name: 'Build',
            color: '#8B5CF6',
            duration: { type: 'minutes', duration: 25 },
            order: 1,
            constraints: { energyRange: { min: 50, max: 75 } }
          },
          {
            id: `segment-${Date.now()}-peak`,
            name: 'Peak',
            color: '#EC4899',
            duration: { type: 'minutes', duration: 30 },
            order: 2,
            constraints: { energyRange: { min: 75, max: 100 } }
          },
          {
            id: `segment-${Date.now()}-land`,
            name: 'Land',
            color: '#06B6D4',
            duration: { type: 'minutes', duration: 20 },
            order: 3,
            constraints: { energyRange: { min: 40, max: 65 } }
          }
        ]

        return {
          segments: defaultSegments,
          currentSet: state.currentSet
            ? { ...state.currentSet, segments: defaultSegments, isSegmented: true }
            : state.currentSet
        }
      }),

      enableSegmentedMode: () => {
        const state = get()
        if (state.segments.length === 0) {
          // Initialize with default segments
          get().initializeDefaultSegments()
        } else {
          set((state) => ({
            currentSet: state.currentSet
              ? { ...state.currentSet, isSegmented: true }
              : state.currentSet
          }))
        }
      },

      disableSegmentedMode: () => set((state) => ({
        currentSet: state.currentSet
          ? { ...state.currentSet, isSegmented: false }
          : state.currentSet,
        activeSegmentId: null
      })),

      // Cloud Sync
      isSyncing: false,
      setSyncing: (syncing) => set({ isSyncing: syncing }),

      saveSetToCloud: async (setId) => {
        const state = get()
        // Always prefer currentSet if it matches the requested ID, since it has the latest data
        // Fall back to finding in sets array, then to currentSet as last resort
        let setToSave = state.currentSet
        if (setId) {
          if (state.currentSet?.id === setId) {
            setToSave = state.currentSet
          } else {
            setToSave = state.sets.find(s => s.id === setId) || state.currentSet
          }
        }

        if (!setToSave) {
          return { success: false, error: 'No set to save' }
        }

        // Debug logging
        console.log('[saveSetToCloud] Saving set:', {
          id: setToSave.id,
          name: setToSave.name,
          playlistLength: setToSave.playlist?.length || 0
        })

        try {
          set({ isSyncing: true })
          const response = await fetch('/api/sets/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setData: setToSave })
          })

          const data = await response.json()
          set({ isSyncing: false })

          if (!response.ok) {
            return { success: false, error: data.error || 'Failed to save set' }
          }

          // Mark the set as saved to cloud
          const savedSetId = setToSave.id
          set((state) => ({
            currentSet: state.currentSet?.id === savedSetId
              ? { ...state.currentSet, savedToCloud: true, updatedAt: new Date() }
              : state.currentSet,
            sets: state.sets.map(s =>
              s.id === savedSetId ? { ...s, savedToCloud: true, updatedAt: new Date() } : s
            )
          }))

          return { success: true }
        } catch (error) {
          set({ isSyncing: false })
          return { success: false, error: 'Network error' }
        }
      },

      loadSetFromCloud: async (setId) => {
        try {
          set({ isSyncing: true })
          const response = await fetch(`/api/sets/${setId}`)
          const data = await response.json()
          set({ isSyncing: false })

          if (!response.ok) {
            return { success: false, error: data.error || 'Failed to load set' }
          }

          // Load the set and make it the current set, mark as savedToCloud since it came from cloud
          const loadedSet = { ...data.set, savedToCloud: true }
          set((state) => {
            const existingSetIndex = state.sets.findIndex(s => s.id === loadedSet.id)
            const newSets = existingSetIndex >= 0
              ? state.sets.map((s, i) => i === existingSetIndex ? loadedSet : s)
              : [...state.sets, loadedSet]

            return {
              currentSet: loadedSet,
              sets: newSets
            }
          })

          return { success: true }
        } catch (error) {
          set({ isSyncing: false })
          return { success: false, error: 'Network error' }
        }
      },

      listCloudSets: async () => {
        try {
          set({ isSyncing: true })
          const response = await fetch('/api/sets/list')
          const data = await response.json()
          set({ isSyncing: false })

          if (!response.ok) {
            return { success: false, error: data.error || 'Failed to list sets' }
          }

          return { success: true, sets: data.sets }
        } catch (error) {
          set({ isSyncing: false })
          return { success: false, error: 'Network error' }
        }
      },

      deleteSetFromCloud: async (setId) => {
        try {
          set({ isSyncing: true })
          const response = await fetch(`/api/sets/${setId}`, {
            method: 'DELETE'
          })
          const data = await response.json()
          set({ isSyncing: false })

          if (!response.ok) {
            return { success: false, error: data.error || 'Failed to delete set' }
          }

          // Also remove from local state
          set((state) => ({
            sets: state.sets.filter(s => s.id !== setId),
            currentSet: state.currentSet?.id === setId ? null : state.currentSet
          }))

          return { success: true }
        } catch (error) {
          set({ isSyncing: false })
          return { success: false, error: 'Network error' }
        }
      },

      // AutoMix State
      autoMix: {
        enabled: false,
        mode: 'seamless',
        crossfadeDuration: 10,
      },
      setAutoMixEnabled: (enabled) =>
        set((state) => ({ autoMix: { ...state.autoMix, enabled } })),
      setAutoMixMode: (mode) =>
        set((state) => ({ autoMix: { ...state.autoMix, mode } })),
      setAutoMixCrossfadeDuration: (seconds) =>
        set((state) => ({
          autoMix: { ...state.autoMix, crossfadeDuration: Math.max(5, Math.min(30, seconds)) },
        })),

      // Dual Player State
      dualPlayer: {
        activePlayer: 'A',
        playerAVideoId: null,
        playerBVideoId: null,
        playerAVolume: 100,
        playerBVolume: 0,
        isCrossfading: false,
        crossfadeProgress: 0,
        nextTrackPreloaded: false,
        transitionScheduledAt: null,
      },
      setDualPlayerState: (updates) =>
        set((state) => ({ dualPlayer: { ...state.dualPlayer, ...updates } })),
      resetDualPlayer: () =>
        set({
          dualPlayer: {
            activePlayer: 'A',
            playerAVideoId: null,
            playerBVideoId: null,
            playerAVolume: 100,
            playerBVolume: 0,
            isCrossfading: false,
            crossfadeProgress: 0,
            nextTrackPreloaded: false,
            transitionScheduledAt: null,
          },
        }),

      // Track BPM/Key enrichment
      enrichTrackBpmKey: (nodeIndex, bpm, key, camelotCode) => {
        set((state) => {
          if (!state.currentSet) return state
          const playlist = [...state.currentSet.playlist]
          if (!playlist[nodeIndex]) return state
          playlist[nodeIndex] = {
            ...playlist[nodeIndex],
            track: {
              ...playlist[nodeIndex].track,
              bpm,
              key,
              camelotCode,
            },
          }
          return {
            currentSet: { ...state.currentSet, playlist, updatedAt: new Date() },
          }
        })
      },
      batchEnrichBpmKey: (updates) => {
        set((state) => {
          if (!state.currentSet) return state
          const playlist = [...state.currentSet.playlist]
          for (const { nodeIndex, bpm, key, camelotCode } of updates) {
            if (playlist[nodeIndex]) {
              playlist[nodeIndex] = {
                ...playlist[nodeIndex],
                track: {
                  ...playlist[nodeIndex].track,
                  bpm,
                  key,
                  camelotCode,
                },
              }
            }
          }
          return {
            currentSet: { ...state.currentSet, playlist, updatedAt: new Date() },
          }
        })
      },
    }),
    {
      name: 'ytdj-ai-storage',
      partialize: (state) => ({
        sets: state.sets,
        aiProvider: state.aiProvider,
        currentSet: state.currentSet,
        constraints: state.constraints,
        activeArcTemplate: state.activeArcTemplate,
        generationControls: state.generationControls,
        autoMix: state.autoMix,
        segments: state.segments,
      }),
    }
  )
)

// Legacy App Store Interface
interface AppState {
  // User & Auth
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void

  // AI Provider
  currentProvider: AIProvider
  setProvider: (provider: AIProvider) => void

  // Current Set
  currentSet: Set | null
  setCurrentSet: (set: Set | null) => void

  // All Sets
  sets: Set[]
  addSet: (set: Set) => void
  updateSet: (id: string, updates: Partial<Set>) => void
  deleteSet: (id: string) => void

  // Nodes
  updateNode: (nodeId: string, updates: Partial<PlaylistNode>) => void
  swapTrack: (nodeId: string, newTrack: Track) => void
  lockNode: (nodeId: string, locked: boolean) => void
  lockEnergy: (nodeId: string, locked: boolean) => void

  // Editor State
  selectedNodeId: string | null
  setSelectedNode: (id: string | null) => void
  playingNodeId: string | null
  setPlayingNode: (id: string | null) => void

  // View Mode
  viewMode: 'arrangement' | 'session' | 'list'
  setViewMode: (mode: 'arrangement' | 'session' | 'list') => void

  // Constraints
  constraints: AIConstraints
  setConstraints: (constraints: Partial<AIConstraints>) => void

  // History (Undo/Redo)
  history: Set[]
  historyIndex: number
  pushHistory: () => void
  undo: () => void
  redo: () => void

  // UI State
  showLeftSidebar: boolean
  showRightSidebar: boolean
  toggleLeftSidebar: () => void
  toggleRightSidebar: () => void

  // Loading States
  isGenerating: boolean
  setIsGenerating: (loading: boolean) => void
  isExporting: boolean
  setIsExporting: (exporting: boolean) => void
}

const defaultConstraints: AIConstraints = {
  energyTolerance: 10,
  novelty: 50,
  artistDiversity: 70,
  genreDiversity: 50,
  decadeSpread: 50,
  avoidArtists: [],
  avoidGenres: [],
  avoidExplicit: false,
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // User & Auth
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),

      // AI Provider
      currentProvider: 'openai',
      setProvider: (provider) => set({ currentProvider: provider }),

      // Current Set
      currentSet: null,
      setCurrentSet: (currentSet) => set({ currentSet }),

      // All Sets
      sets: [],
      addSet: (newSet) => set((state) => ({ sets: [...state.sets, newSet] })),
      updateSet: (id, updates) => set((state) => ({
        sets: state.sets.map((s) => s.id === id ? { ...s, ...updates } : s),
        currentSet: state.currentSet?.id === id
          ? { ...state.currentSet, ...updates }
          : state.currentSet,
      })),
      deleteSet: (id) => set((state) => ({
        sets: state.sets.filter((s) => s.id !== id),
        currentSet: state.currentSet?.id === id ? null : state.currentSet,
      })),

      // Nodes
      updateNode: (nodeId, updates) => set((state) => {
        if (!state.currentSet || !state.currentSet.nodes) return state
        const updatedNodes = state.currentSet.nodes.map((n) =>
          n.id === nodeId ? { ...n, ...updates } : n
        )
        return {
          currentSet: { ...state.currentSet, nodes: updatedNodes },
        }
      }),
      swapTrack: (nodeId, newTrack) => set((state) => {
        if (!state.currentSet || !state.currentSet.nodes) return state
        const updatedNodes = state.currentSet.nodes.map((n) =>
          n.id === nodeId ? { ...n, track: newTrack, targetEnergy: newTrack.energy } : n
        )
        return {
          currentSet: { ...state.currentSet, nodes: updatedNodes },
        }
      }),
      lockNode: (nodeId, locked) => set((state) => {
        if (!state.currentSet || !state.currentSet.nodes) return state
        const updatedNodes = state.currentSet.nodes.map((n) =>
          n.id === nodeId ? { ...n, isLocked: locked, state: (locked ? 'user-locked' : 'ai-selected') as NodeState } : n
        )
        return {
          currentSet: { ...state.currentSet, nodes: updatedNodes },
        }
      }),
      lockEnergy: (nodeId, locked) => set((state) => {
        if (!state.currentSet || !state.currentSet.nodes) return state
        const updatedNodes = state.currentSet.nodes.map((n) =>
          n.id === nodeId ? { ...n, isEnergyLocked: locked, state: (locked ? 'energy-locked' : 'ai-selected') as NodeState } : n
        )
        return {
          currentSet: { ...state.currentSet, nodes: updatedNodes },
        }
      }),

      // Editor State
      selectedNodeId: null,
      setSelectedNode: (id) => set({ selectedNodeId: id }),
      playingNodeId: null,
      setPlayingNode: (id) => set({ playingNodeId: id }),

      // View Mode
      viewMode: 'arrangement',
      setViewMode: (mode) => set({ viewMode: mode }),

      // Constraints
      constraints: defaultConstraints,
      setConstraints: (updates) => set((state) => ({
        constraints: { ...state.constraints, ...updates },
      })),

      // History
      history: [],
      historyIndex: -1,
      pushHistory: () => set((state) => {
        if (!state.currentSet) return state
        const newHistory = state.history.slice(0, state.historyIndex + 1)
        return {
          history: [...newHistory, JSON.parse(JSON.stringify(state.currentSet))],
          historyIndex: state.historyIndex + 1,
        }
      }),
      undo: () => set((state) => {
        if (state.historyIndex <= 0) return state
        const newIndex = state.historyIndex - 1
        return {
          currentSet: state.history[newIndex],
          historyIndex: newIndex,
        }
      }),
      redo: () => set((state) => {
        if (state.historyIndex >= state.history.length - 1) return state
        const newIndex = state.historyIndex + 1
        return {
          currentSet: state.history[newIndex],
          historyIndex: newIndex,
        }
      }),

      // UI State
      showLeftSidebar: true,
      showRightSidebar: true,
      toggleLeftSidebar: () => set((state) => ({ showLeftSidebar: !state.showLeftSidebar })),
      toggleRightSidebar: () => set((state) => ({ showRightSidebar: !state.showRightSidebar })),

      // Loading States
      isGenerating: false,
      setIsGenerating: (loading) => set({ isGenerating: loading }),
      isExporting: false,
      setIsExporting: (exporting) => set({ isExporting: exporting }),
    }),
    {
      name: 'ytdj-storage',
      partialize: (state) => ({
        sets: state.sets,
        constraints: state.constraints,
        currentProvider: state.currentProvider,
      }),
    }
  )
)

// Arc Templates (energyProfile: 1-100 scale)
export const arcTemplates: ArcTemplate[] = [
  {
    id: 'mountain',
    name: 'The Mountain',
    description: 'Warm-up → Peak → Cooldown',
    svgPath: 'M0,25 Q25,25 50,5 Q75,25 100,25',
    energyProfile: [30, 45, 70, 95, 100, 95, 80, 55, 35, 25],
  },
  {
    id: 'slow-burn',
    name: 'Slow Burn',
    description: 'Gradual build throughout',
    svgPath: 'M0,25 Q50,20 100,5',
    energyProfile: [20, 30, 45, 55, 70, 80, 95, 100, 100, 100],
  },
  {
    id: 'rollercoaster',
    name: 'The Rollercoaster',
    description: 'Multiple peaks and valleys',
    svgPath: 'M0,15 Q15,5 25,15 Q35,25 50,10 Q65,25 75,15 Q85,5 100,20',
    energyProfile: [70, 95, 55, 95, 45, 100, 50, 95, 65, 80],
  },
  {
    id: 'wave',
    name: 'The Wave',
    description: 'Smooth oscillations',
    svgPath: 'M0,15 Q25,5 50,15 Q75,25 100,15',
    energyProfile: [55, 80, 95, 80, 55, 45, 55, 80, 95, 70],
  },
  {
    id: 'steady',
    name: 'Steady State',
    description: 'Consistent energy level',
    svgPath: 'M0,15 L100,15',
    energyProfile: [75, 75, 75, 75, 75, 75, 75, 75, 75, 75],
  },
  {
    id: 'descend',
    name: 'The Descent',
    description: 'Wind down session',
    svgPath: 'M0,5 Q50,10 100,25',
    energyProfile: [100, 95, 80, 70, 55, 45, 35, 30, 25, 20],
  },
  {
    id: 'double-peak',
    name: 'Double Peak',
    description: 'Two energy climaxes',
    svgPath: 'M0,20 Q12,10 25,5 Q38,15 50,20 Q62,10 75,5 Q88,15 100,20',
    energyProfile: [45, 70, 95, 80, 65, 70, 95, 95, 80, 55],
  },
  {
    id: 'late-night',
    name: 'Late Night',
    description: 'Deep groove to sunrise build',
    svgPath: 'M0,15 Q30,18 50,15 Q70,10 85,5 Q95,8 100,12',
    energyProfile: [65, 70, 72, 70, 72, 75, 80, 90, 88, 78],
  },
  {
    id: 'explosive',
    name: 'Explosive Start',
    description: 'Maximum energy opener, gradual wind down',
    svgPath: 'M0,5 Q10,5 20,8 Q40,15 60,18 Q80,22 100,25',
    energyProfile: [100, 98, 92, 85, 75, 65, 55, 45, 38, 30],
  },
  {
    id: 'tension-release',
    name: 'Tension & Release',
    description: 'Build tension, explosive release, recover',
    svgPath: 'M0,20 Q20,15 40,8 Q50,5 55,5 Q60,20 80,22 Q90,20 100,18',
    energyProfile: [50, 60, 75, 88, 100, 100, 45, 40, 50, 55],
  },
  {
    id: 'chill-vibes',
    name: 'Chill Vibes',
    description: 'Low energy ambient journey',
    svgPath: 'M0,20 Q25,22 50,18 Q75,22 100,20',
    energyProfile: [35, 40, 45, 38, 42, 35, 40, 45, 42, 38],
  },
  {
    id: 'festival-closer',
    name: 'Festival Closer',
    description: 'Epic build to massive finale',
    svgPath: 'M0,25 Q20,22 40,18 Q60,12 80,8 Q90,5 100,5',
    energyProfile: [40, 50, 60, 70, 78, 85, 92, 98, 100, 100],
  },
]
