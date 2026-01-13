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
  NodeState
} from '@/types'

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

// YTDJ Store Interface (simplified for main app)
interface YTDJState {
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

  // Initialize
  initializeStore: () => void

  // Cloud Sync
  saveSetToCloud: (setId?: string) => Promise<{ success: boolean; error?: string }>
  loadSetFromCloud: (setId: string) => Promise<{ success: boolean; error?: string }>
  listCloudSets: () => Promise<{ success: boolean; sets?: any[]; error?: string }>
  deleteSetFromCloud: (setId: string) => Promise<{ success: boolean; error?: string }>
  isSyncing: boolean
  setSyncing: (syncing: boolean) => void
}

export const useYTDJStore = create<YTDJState>()(
  persist(
    (set, get) => ({
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
      activeArcTemplate: 'warmup',
      setActiveArcTemplate: (templateId) => set({ activeArcTemplate: templateId }),

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

      // Cloud Sync
      isSyncing: false,
      setSyncing: (syncing) => set({ isSyncing: syncing }),

      saveSetToCloud: async (setId) => {
        const state = get()
        const setToSave = setId
          ? state.sets.find(s => s.id === setId) || state.currentSet
          : state.currentSet

        if (!setToSave) {
          return { success: false, error: 'No set to save' }
        }

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

          // Load the set and make it the current set
          const loadedSet = data.set
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
      }
    }),
    {
      name: 'ytdj-ai-storage',
      partialize: (state) => ({
        sets: state.sets,
        aiProvider: state.aiProvider,
        currentSet: state.currentSet,
        constraints: state.constraints,
        activeArcTemplate: state.activeArcTemplate,
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
]
