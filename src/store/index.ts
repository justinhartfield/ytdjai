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

  // Loading States
  isGenerating: boolean
  setIsGenerating: (loading: boolean) => void

  // Initialize
  initializeStore: () => void
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
      updatePlaylist: (playlist) => set((state) => {
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
      }),

      // Loading States
      isGenerating: false,
      setIsGenerating: (loading) => set({ isGenerating: loading }),

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
      }
    }),
    {
      name: 'ytdj-ai-storage',
      partialize: (state) => ({
        sets: state.sets,
        aiProvider: state.aiProvider,
        currentSet: state.currentSet,
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
  lockBpm: (nodeId: string, locked: boolean) => void

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
  bpmTolerance: 5,
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
          n.id === nodeId ? { ...n, track: newTrack, targetBpm: newTrack.bpm } : n
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
      lockBpm: (nodeId, locked) => set((state) => {
        if (!state.currentSet || !state.currentSet.nodes) return state
        const updatedNodes = state.currentSet.nodes.map((n) =>
          n.id === nodeId ? { ...n, isBpmLocked: locked, state: (locked ? 'bpm-locked' : 'ai-selected') as NodeState } : n
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

// Arc Templates
export const arcTemplates: ArcTemplate[] = [
  {
    id: 'mountain',
    name: 'The Mountain',
    description: 'Warm-up → Peak → Cooldown',
    svgPath: 'M0,25 Q25,25 50,5 Q75,25 100,25',
    bpmProfile: [90, 100, 120, 140, 150, 145, 130, 110, 95, 85],
  },
  {
    id: 'slow-burn',
    name: 'Slow Burn',
    description: 'Gradual build throughout',
    svgPath: 'M0,25 Q50,20 100,5',
    bpmProfile: [80, 90, 100, 110, 120, 130, 140, 150, 155, 160],
  },
  {
    id: 'rollercoaster',
    name: 'The Rollercoaster',
    description: 'Multiple peaks and valleys',
    svgPath: 'M0,15 Q15,5 25,15 Q35,25 50,10 Q65,25 75,15 Q85,5 100,20',
    bpmProfile: [120, 140, 110, 145, 100, 150, 105, 140, 115, 130],
  },
  {
    id: 'wave',
    name: 'The Wave',
    description: 'Smooth oscillations',
    svgPath: 'M0,15 Q25,5 50,15 Q75,25 100,15',
    bpmProfile: [110, 130, 140, 130, 110, 100, 110, 130, 140, 120],
  },
  {
    id: 'steady',
    name: 'Steady State',
    description: 'Consistent energy level',
    svgPath: 'M0,15 L100,15',
    bpmProfile: [125, 125, 125, 125, 125, 125, 125, 125, 125, 125],
  },
  {
    id: 'descend',
    name: 'The Descent',
    description: 'Wind down session',
    svgPath: 'M0,5 Q50,10 100,25',
    bpmProfile: [150, 140, 130, 120, 110, 100, 95, 90, 85, 80],
  },
]
