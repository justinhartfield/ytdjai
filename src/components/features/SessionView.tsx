'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Undo2, Redo2, Play, Pause,
  Lock, X, Plus, Sparkles, Info, Loader2, Cloud, FolderOpen, GripVertical,
  ChevronLeft, ChevronRight, AlertTriangle, Zap, RefreshCw
} from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import { TransportBar } from './TransportBar'
import { useYTDJStore, arcTemplates } from '@/store'
import { generatePlaylist } from '@/lib/ai-service'
import { formatTime } from './YouTubePlayer'
import { IconSidebar } from './IconSidebar'
import { AIConstraintsDrawer } from './AIConstraintsDrawer'
import { SetsDashboard } from './SetsDashboard'
import { ExportFlow } from './ExportFlow'
import { AIControlsSidebar } from './AIControlsSidebar'
import { SaveSetDialog } from './SaveSetDialog'
import { BrowseSetsModal } from './BrowseSetsModal'
import type { PlaylistNode, Track, Set, AIConstraints, AlternativeTrack, AIProvider } from '@/types'
import { GhostTrackCard, AIProviderBadge } from './GhostTrackNode'

interface SessionViewProps {
  onViewChange: (view: 'arrangement' | 'session') => void
  currentView: 'arrangement' | 'session'
  onGoHome?: () => void
}

interface SessionColumn {
  id: string
  targetEnergy: number
  activeTrack: PlaylistNode
  alternatives: AlternativeTrack[]
}

export function SessionView({ onViewChange, currentView, onGoHome }: SessionViewProps) {
  const {
    currentSet,
    updatePlaylist,
    updateSetWithPrompt,
    aiProvider,
    isGenerating,
    setIsGenerating,
    player,
    playTrack,
    pauseTrack,
    skipNext,
    skipPrevious,
    ui,
    setLeftSidebarPanel,
    setCurrentSet,
    constraints,
    undo,
    redo,
    canUndo,
    canRedo,
    activeArcTemplate,
    generationProgress,
    swapWithProviderAlternative
  } = useYTDJStore()
  const playlist = currentSet?.playlist || []

  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null)
  const [auditioningTrack, setAuditioningTrack] = useState<Track | null>(null)
  const [showExport, setShowExport] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showBrowseSets, setShowBrowseSets] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [addingTrackAtIndex, setAddingTrackAtIndex] = useState<number | null>(null)
  const [energyTolerance, setEnergyTolerance] = useState(10)
  const [targetTrackCount, setTargetTrackCount] = useState(8)

  // Arc mismatch modal state
  const [arcMismatchInfo, setArcMismatchInfo] = useState<{
    arcId: string
    arcName: string
    poorFitCount: number
    poorFitPositions: number[]
  } | null>(null)

  // Drag and drop state
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const dragStartX = useRef<number>(0)
  const columnsContainerRef = useRef<HTMLDivElement>(null)

  // Horizontal scroll state for >10 days
  const gridScrollContainerRef = useRef<HTMLDivElement>(null)
  const headerScrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Check for auto-open export flag (returning from OAuth)
  useEffect(() => {
    const shouldOpenExport = sessionStorage.getItem('ytdj-auto-open-export')
    if (shouldOpenExport === 'true') {
      // Clear the flag first to prevent loops
      sessionStorage.removeItem('ytdj-auto-open-export')
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        setShowExport(true)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [])

  // Player state from store
  const { isPlaying, playingNodeIndex, currentTime, duration } = player
  const activeTrackIndex = playingNodeIndex ?? 0

  // Convert playlist to session columns - use alternatives from AI generation
  const sessionColumns: SessionColumn[] = useMemo(() => {
    return playlist.map((node, index) => ({
      id: node.id,
      targetEnergy: node.targetEnergy || node.track.energy || 50,
      activeTrack: node,
      alternatives: node.alternatives || [] // Pre-populated from AI generation
    }))
  }, [playlist])

  const totalDuration = playlist.reduce((acc, node) => acc + node.track.duration, 0)

  // Middle-click drag scrolling state
  const [isMiddleDragging, setIsMiddleDragging] = useState(false)
  const middleDragStart = useRef<{ x: number; scrollLeft: number } | null>(null)

  // Update scroll button visibility
  const updateScrollButtons = useCallback(() => {
    const container = gridScrollContainerRef.current
    if (!container) return

    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 1)
  }, [])

  // Sync header and grid scroll positions
  const handleGridScroll = useCallback(() => {
    const gridContainer = gridScrollContainerRef.current
    const headerContainer = headerScrollContainerRef.current
    if (gridContainer && headerContainer) {
      headerContainer.scrollLeft = gridContainer.scrollLeft
    }
    updateScrollButtons()
  }, [updateScrollButtons])

  // Scroll by a fixed amount (3 columns)
  const scrollByAmount = useCallback((direction: 'left' | 'right') => {
    const container = gridScrollContainerRef.current
    if (!container) return

    const columnWidth = 200 // min-w-[200px]
    const scrollAmount = columnWidth * 3
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }, [])

  // Initialize scroll button state
  useEffect(() => {
    updateScrollButtons()
    const container = gridScrollContainerRef.current
    if (container) {
      container.addEventListener('scroll', handleGridScroll)
      return () => container.removeEventListener('scroll', handleGridScroll)
    }
  }, [handleGridScroll, updateScrollButtons, sessionColumns.length])

  // Middle-click drag handlers
  const handleMiddleMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse button is button 1
    if (e.button !== 1) return
    e.preventDefault()

    const container = gridScrollContainerRef.current
    if (!container) return

    setIsMiddleDragging(true)
    middleDragStart.current = {
      x: e.clientX,
      scrollLeft: container.scrollLeft
    }
  }, [])

  const handleMiddleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isMiddleDragging || !middleDragStart.current) return

    const container = gridScrollContainerRef.current
    if (!container) return

    const deltaX = e.clientX - middleDragStart.current.x
    container.scrollLeft = middleDragStart.current.scrollLeft - deltaX
  }, [isMiddleDragging])

  const handleMiddleMouseUp = useCallback(() => {
    setIsMiddleDragging(false)
    middleDragStart.current = null
  }, [])

  // Clean up middle drag on mouse leave
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isMiddleDragging) {
        setIsMiddleDragging(false)
        middleDragStart.current = null
      }
    }

    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [isMiddleDragging])

  const handleSelectTrack = (track: Track, columnIndex: number) => {
    setSelectedTrack(track)
    setSelectedColumnIndex(columnIndex)
  }

  const handleAuditionTrack = (track: Track, columnIndex: number) => {
    setAuditioningTrack(track)
    setSelectedTrack(track)
    setSelectedColumnIndex(columnIndex)
  }

  const handleSwapIn = useCallback(async (track: Track, columnIndex: number) => {
    // If the track doesn't have a youtubeId, fetch it first
    let enrichedTrack = track
    if (!track.youtubeId) {
      try {
        const response = await fetch('/api/youtube/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artist: track.artist, title: track.title })
        })
        const result = await response.json()
        if (result.success && result.youtubeId) {
          enrichedTrack = {
            ...track,
            youtubeId: result.youtubeId,
            thumbnail: result.thumbnail || track.thumbnail,
            duration: result.duration || track.duration
          }
        }
      } catch (error) {
        console.error('[SessionView] Failed to enrich track with YouTube data:', error)
      }
    }

    const newPlaylist = [...playlist]
    newPlaylist[columnIndex] = {
      ...newPlaylist[columnIndex],
      track: enrichedTrack
    }
    updatePlaylist(newPlaylist)
    setSelectedTrack(enrichedTrack)
    setAuditioningTrack(null)
  }, [playlist, updatePlaylist])

  const handleLockToggle = useCallback((columnIndex: number) => {
    const newPlaylist = [...playlist]
    newPlaylist[columnIndex] = {
      ...newPlaylist[columnIndex],
      isLocked: !newPlaylist[columnIndex].isLocked
    }
    updatePlaylist(newPlaylist)
  }, [playlist, updatePlaylist])

  // Global Ops: Regenerate Grid
  const handleRegenerateGrid = useCallback(async (promptOverride?: string) => {
    const prompt = promptOverride || currentSet?.prompt
    if (isRegenerating || !prompt) return

    setIsRegenerating(true)
    try {
      const result = await generatePlaylist({
        prompt,
        constraints: {
          trackCount: playlist.length || 8,
          energyRange: { min: 20, max: 80 },
          energyTolerance: constraints.energyTolerance,
          artistDiversity: constraints.diversity
        } as AIConstraints,
        provider: aiProvider
      })

      if (result.success && result.playlist) {
        // Preserve locked tracks
        const newPlaylist = result.playlist.map((node, index) => {
          const existingNode = playlist[index]
          if (existingNode?.isLocked) {
            return { ...node, track: existingNode.track, isLocked: true }
          }
          return node
        })
        updateSetWithPrompt(newPlaylist, prompt)
      }
    } catch (error) {
      console.error('Failed to regenerate grid:', error)
    } finally {
      setIsRegenerating(false)
    }
  }, [isRegenerating, currentSet, playlist, constraints, aiProvider, updateSetWithPrompt])

  // Fit songs to arc - rearrange unlocked tracks to best match the energy curve
  const handleFitToArc = useCallback((arcId: string) => {
    if (playlist.length < 2) return

    const arc = arcTemplates.find(a => a.id === arcId)
    if (!arc) return

    // Energy tolerance threshold - tracks more than this off from target are "poor fit"
    const POOR_FIT_THRESHOLD = 20

    // Interpolate the arc's energy profile to match the playlist length
    const targetEnergies: number[] = []
    for (let i = 0; i < playlist.length; i++) {
      const position = i / (playlist.length - 1) // 0 to 1
      const profileIndex = position * (arc.energyProfile.length - 1)
      const lowerIndex = Math.floor(profileIndex)
      const upperIndex = Math.ceil(profileIndex)
      const fraction = profileIndex - lowerIndex

      if (upperIndex >= arc.energyProfile.length) {
        targetEnergies.push(arc.energyProfile[arc.energyProfile.length - 1])
      } else {
        const interpolatedEnergy = arc.energyProfile[lowerIndex] * (1 - fraction) + arc.energyProfile[upperIndex] * fraction
        targetEnergies.push(Math.round(interpolatedEnergy))
      }
    }

    // Separate locked and unlocked tracks
    const lockedPositions = new Map<number, PlaylistNode>()
    const unlockedTracks: { node: PlaylistNode; energy: number }[] = []

    playlist.forEach((node, index) => {
      if (node.isLocked) {
        lockedPositions.set(index, node)
      } else {
        unlockedTracks.push({
          node,
          energy: node.track.energy || 50
        })
      }
    })

    // For each unlocked position, find the best matching unlocked track
    const newPlaylist: PlaylistNode[] = new Array(playlist.length)
    const usedTracks = new Set<string>()
    const poorFitPositions: number[] = []

    // First, place locked tracks and check if they fit
    lockedPositions.forEach((node, index) => {
      newPlaylist[index] = node
      const energyDiff = Math.abs((node.track.energy || 50) - targetEnergies[index])
      if (energyDiff > POOR_FIT_THRESHOLD) {
        poorFitPositions.push(index)
      }
    })

    // Then, for each unlocked position, find the best matching track
    for (let i = 0; i < playlist.length; i++) {
      if (lockedPositions.has(i)) continue

      const targetEnergy = targetEnergies[i]
      let bestMatch: { node: PlaylistNode; energy: number } | null = null
      let bestDiff = Infinity

      for (const track of unlockedTracks) {
        if (usedTracks.has(track.node.id)) continue
        const diff = Math.abs(track.energy - targetEnergy)
        if (diff < bestDiff) {
          bestDiff = diff
          bestMatch = track
        }
      }

      if (bestMatch) {
        newPlaylist[i] = {
          ...bestMatch.node,
          targetEnergy: targetEnergy
        }
        usedTracks.add(bestMatch.node.id)

        // Check if this is a poor fit
        if (bestDiff > POOR_FIT_THRESHOLD) {
          poorFitPositions.push(i)
        }
      }
    }

    // If there are poor fits, show the confirmation modal
    if (poorFitPositions.length > 0) {
      setArcMismatchInfo({
        arcId,
        arcName: arc.name,
        poorFitCount: poorFitPositions.length,
        poorFitPositions
      })
      // Still apply the best-effort rearrangement
      updatePlaylist(newPlaylist)
    } else {
      // Perfect fit - just update
      updatePlaylist(newPlaylist)
    }
  }, [playlist, updatePlaylist])

  // Regenerate poor fit tracks to match arc
  const handleRegeneratePoorFits = useCallback(async () => {
    if (!arcMismatchInfo || isRegenerating) return

    const arc = arcTemplates.find(a => a.id === arcMismatchInfo.arcId)
    if (!arc) return

    setIsRegenerating(true)
    setArcMismatchInfo(null)

    try {
      // Calculate target energies for each position
      const targetEnergies: number[] = []
      for (let i = 0; i < playlist.length; i++) {
        const position = i / (playlist.length - 1)
        const profileIndex = position * (arc.energyProfile.length - 1)
        const lowerIndex = Math.floor(profileIndex)
        const upperIndex = Math.ceil(profileIndex)
        const fraction = profileIndex - lowerIndex

        if (upperIndex >= arc.energyProfile.length) {
          targetEnergies.push(arc.energyProfile[arc.energyProfile.length - 1])
        } else {
          const interpolatedEnergy = arc.energyProfile[lowerIndex] * (1 - fraction) + arc.energyProfile[upperIndex] * fraction
          targetEnergies.push(Math.round(interpolatedEnergy))
        }
      }

      // Generate replacement tracks for poor fit positions
      const poorFitPositions = arcMismatchInfo.poorFitPositions.filter(pos => !playlist[pos]?.isLocked)

      if (poorFitPositions.length === 0) {
        // All poor fits are locked, nothing we can do
        return
      }

      const result = await generatePlaylist({
        prompt: `${currentSet?.prompt || 'Generate tracks'}. Focus on tracks with these specific energy levels: ${poorFitPositions.map(pos => `position ${pos + 1} needs energy ~${targetEnergies[pos]}`).join(', ')}`,
        constraints: {
          trackCount: poorFitPositions.length,
          energyRange: { min: 1, max: 100 },
          energyTolerance: constraints.energyTolerance,
          syncopation: constraints.syncopation,
          keyMatch: constraints.keyMatch,
          artistDiversity: constraints.diversity,
          discovery: constraints.discovery,
          activeDecades: constraints.activeDecades,
          blacklist: constraints.blacklist
        } as AIConstraints,
        provider: aiProvider
      })

      if (result.success && result.playlist && result.playlist.length > 0) {
        // Replace poor fit tracks with new ones
        const newPlaylist = [...playlist]
        result.playlist.forEach((newNode, idx) => {
          if (idx < poorFitPositions.length) {
            const targetPos = poorFitPositions[idx]
            newPlaylist[targetPos] = {
              ...newNode,
              targetEnergy: targetEnergies[targetPos]
            }
          }
        })
        updatePlaylist(newPlaylist)
      }
    } catch (error) {
      console.error('Failed to regenerate poor fit tracks:', error)
    } finally {
      setIsRegenerating(false)
    }
  }, [arcMismatchInfo, isRegenerating, playlist, currentSet, constraints, aiProvider, updatePlaylist])

  // Add track at specific position (insert between tiles)
  const handleInsertTrack = useCallback(async (insertIndex: number) => {
    if (addingTrackAtIndex !== null) return

    setAddingTrackAtIndex(insertIndex)
    try {
      const result = await generatePlaylist({
        prompt: currentSet?.prompt || 'Add a track that fits the set',
        constraints: {
          trackCount: 1,
          energyRange: { min: 20, max: 80 }
        } as AIConstraints,
        provider: aiProvider
      })

      if (result.success && result.playlist && result.playlist.length > 0) {
        const newTrack = result.playlist[0]
        const newPlaylist = [...playlist]
        // Insert at the specified index
        newPlaylist.splice(insertIndex, 0, newTrack)
        updatePlaylist(newPlaylist)
      }
    } catch (error) {
      console.error('Failed to add track:', error)
    } finally {
      setAddingTrackAtIndex(null)
    }
  }, [addingTrackAtIndex, currentSet, playlist, aiProvider, updatePlaylist])

  // Generate new track to replace existing (AI Generate button)
  const handleGenerateNewTrack = useCallback(async (columnIndex: number) => {
    if (addingTrackAtIndex !== null) return

    setAddingTrackAtIndex(columnIndex)
    try {
      const result = await generatePlaylist({
        prompt: currentSet?.prompt || 'Generate a new track that fits the set',
        constraints: {
          trackCount: 1,
          energyRange: { min: 20, max: 80 }
        } as AIConstraints,
        provider: aiProvider
      })

      if (result.success && result.playlist && result.playlist.length > 0) {
        const newTrack = result.playlist[0]
        const newPlaylist = [...playlist]
        // Replace the track at the column index
        newPlaylist[columnIndex] = newTrack
        updatePlaylist(newPlaylist)
      }
    } catch (error) {
      console.error('Failed to generate track:', error)
    } finally {
      setAddingTrackAtIndex(null)
    }
  }, [addingTrackAtIndex, currentSet, playlist, aiProvider, updatePlaylist])

  // Drag and drop handlers for horizontal reordering
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, columnIndex: number) => {
    e.preventDefault()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    dragStartX.current = clientX
    setDraggedColumnIndex(columnIndex)
  }, [])

  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (draggedColumnIndex === null || !columnsContainerRef.current) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const container = columnsContainerRef.current
    const containerRect = container.getBoundingClientRect()

    // Calculate which column we're over based on x position
    const relativeX = clientX - containerRect.left + container.scrollLeft
    const columnWidth = 200 // min-w-[200px]
    let targetIndex = Math.floor(relativeX / columnWidth)
    targetIndex = Math.max(0, Math.min(targetIndex, sessionColumns.length - 1))

    if (targetIndex !== draggedColumnIndex) {
      setDropTargetIndex(targetIndex)
    } else {
      setDropTargetIndex(null)
    }
  }, [draggedColumnIndex, sessionColumns.length])

  const handleDragEnd = useCallback(() => {
    if (draggedColumnIndex !== null && dropTargetIndex !== null && draggedColumnIndex !== dropTargetIndex) {
      // Reorder the playlist
      const newPlaylist = [...playlist]
      const [removed] = newPlaylist.splice(draggedColumnIndex, 1)
      newPlaylist.splice(dropTargetIndex, 0, removed)
      updatePlaylist(newPlaylist)
    }
    setDraggedColumnIndex(null)
    setDropTargetIndex(null)
  }, [draggedColumnIndex, dropTargetIndex, playlist, updatePlaylist])

  return (
    <div className="h-full flex flex-col bg-[#05060f] overflow-hidden">
      {/* Scanline Effect */}
      <div className="fixed inset-0 pointer-events-none z-50">
        <div className="absolute w-full h-24 bg-gradient-to-b from-transparent via-cyan-500/[0.02] to-transparent animate-scanline" />
      </div>

      {/* Header */}
      <header className="h-16 bg-[#0a0c1c]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 z-40">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-cyan-500 to-pink-500 flex items-center justify-center font-black text-black text-sm">YT</div>
            <h1 className="text-xl font-extrabold tracking-tighter uppercase">YTDJ<span className="text-cyan-400">.AI</span></h1>
          </div>

          <nav className="flex items-center bg-black/40 rounded-full border border-white/5 p-1">
            <button
              onClick={() => onViewChange('arrangement')}
              className={cn(
                'px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest transition-all',
                currentView === 'arrangement' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
              )}
            >
              ARRANGEMENT
            </button>
            <button
              onClick={() => onViewChange('session')}
              className={cn(
                'px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest transition-all',
                currentView === 'session' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
              )}
            >
              SESSION
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={!canUndo()}
              className={cn(
                "p-2 transition-colors rounded",
                canUndo() ? "text-gray-400 hover:text-cyan-400 hover:bg-white/5" : "text-gray-600 cursor-not-allowed"
              )}
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo()}
              className={cn(
                "p-2 transition-colors rounded",
                canRedo() ? "text-gray-400 hover:text-cyan-400 hover:bg-white/5" : "text-gray-600 cursor-not-allowed"
              )}
            >
              <Redo2 className="w-5 h-5" />
            </button>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Project:</span>
            <button
              onClick={() => setShowBrowseSets(true)}
              className="flex items-center gap-2 text-sm font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              {currentSet?.name || 'Untitled Set'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSaveDialog(true)}
              disabled={!currentSet || playlist.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 text-xs font-black rounded hover:bg-purple-500/30 hover:scale-105 transition-all border border-purple-500/30 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Cloud className="w-4 h-4" />
              Save to Cloud
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="px-6 py-2 bg-white text-black text-xs font-black rounded hover:bg-cyan-400 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] uppercase tracking-widest"
            >
              Export Set
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Icon Sidebar */}
        <IconSidebar onViewChange={onViewChange} currentView={currentView} onGoHome={onGoHome} />

        {/* AI Constraints Drawer */}
        <AIConstraintsDrawer
          isOpen={ui.leftSidebarPanel === 'constraints'}
          onClose={() => setLeftSidebarPanel(null)}
          onRegenerate={() => handleRegenerateGrid()}
        />

        {/* Sets Dashboard Drawer */}
        <SetsDashboard
          isOpen={ui.leftSidebarPanel === 'sets'}
          onClose={() => setLeftSidebarPanel(null)}
          onSelectSet={(set: Set) => {
            setCurrentSet(set)
            setLeftSidebarPanel(null)
          }}
        />

        {/* Left Sidebar: AI Controls */}
        <AIControlsSidebar
          onRegenerate={(mode, prompt) => handleRegenerateGrid(prompt)}
          onFitToArc={handleFitToArc}
          isGenerating={isRegenerating}
          energyTolerance={energyTolerance}
          onEnergyToleranceChange={setEnergyTolerance}
          targetTrackCount={targetTrackCount}
          onTargetTrackCountChange={setTargetTrackCount}
        />

        {/* Center Canvas: Session Grid */}
        <section className="flex-1 relative flex flex-col overflow-hidden bg-[#070815]" style={{
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}>
          {/* Session Header Labels */}
          <div className="h-10 border-b border-white/5 flex items-center justify-between bg-black/60 z-10">
            <div className="flex items-center">
              <div className="w-16 border-r border-white/5 flex items-center justify-center">
                <span className="text-[9px] font-bold text-gray-600">SLOT</span>
              </div>
            </div>

            {/* AI Provider Results Selector & Loading Status */}
            <div className="flex items-center gap-4 px-4">
              {/* Provider Selector */}
              {generationProgress.providerPlaylists.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold tracking-[0.2em] text-gray-500 mr-2">AI RESULTS:</span>
                  {generationProgress.providerPlaylists.map(({ provider }) => (
                    <button
                      key={provider}
                      onClick={() => swapWithProviderAlternative(provider)}
                      className={cn(
                        'px-3 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all',
                        generationProgress.primaryProvider === provider
                          ? 'bg-cyan-500 text-black'
                          : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                      )}
                    >
                      {provider === 'openai' ? 'GPT-4o' : provider === 'claude' ? 'Claude' : 'Gemini'}
                    </button>
                  ))}
                </div>
              )}

              {/* Loading Status */}
              {generationProgress.isGenerating && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {(['openai', 'claude', 'gemini'] as AIProvider[]).map((provider) => {
                      const isActive = generationProgress.activeProviders.includes(provider)
                      const isComplete = generationProgress.completedProviders.includes(provider)
                      const isFailed = generationProgress.failedProviders.includes(provider)
                      return (
                        <div
                          key={provider}
                          className={cn(
                            'w-2 h-2 rounded-full transition-all',
                            isComplete ? 'bg-green-500' :
                            isFailed ? 'bg-red-500' :
                            isActive ? 'bg-cyan-500 animate-pulse' : 'bg-gray-600'
                          )}
                          title={`${provider}: ${isComplete ? 'Done' : isFailed ? 'Failed' : isActive ? 'Loading...' : 'Waiting'}`}
                        />
                      )
                    })}
                  </div>
                  <span className="text-[9px] font-bold tracking-wider text-cyan-400">
                    {generationProgress.enrichedCount > 0
                      ? `Enriching ${generationProgress.enrichedCount}/${generationProgress.skeletonCount}`
                      : 'Generating...'}
                  </span>
                </div>
              )}
            </div>
            <div
              ref={headerScrollContainerRef}
              className="flex overflow-x-auto custom-scrollbar flex-1 scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {sessionColumns.map((col, index) => (
                <div
                  key={col.id}
                  className="min-w-[200px] flex-shrink-0 border-r border-white/5 px-4 flex items-center justify-between"
                >
                  <span className="text-[10px] font-bold text-cyan-400">{String(index + 1).padStart(2, '0')}</span>
                  <span className="text-[9px] font-mono text-gray-500">Energy: {col.targetEnergy}</span>
                </div>
              ))}
            </div>
          </div>

          {/* The Grid with scroll navigation */}
          <div className="flex-1 flex relative">
            {/* Scroll Left Button */}
            {canScrollLeft && (
              <button
                onClick={() => scrollByAmount('left')}
                className="absolute left-16 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/80 border border-white/10 flex items-center justify-center hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all shadow-lg"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
            )}

            {/* Scroll Right Button */}
            {canScrollRight && (
              <button
                onClick={() => scrollByAmount('right')}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/80 border border-white/10 flex items-center justify-center hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all shadow-lg"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            )}

            <div
              ref={gridScrollContainerRef}
              className={cn(
                "flex-1 flex overflow-x-auto custom-scrollbar relative z-10",
                isMiddleDragging && "cursor-grabbing select-none"
              )}
              onMouseDown={handleMiddleMouseDown}
              onMouseMove={(e) => {
                if (draggedColumnIndex !== null) handleDragMove(e)
                handleMiddleMouseMove(e)
              }}
              onMouseUp={(e) => {
                if (draggedColumnIndex !== null) handleDragEnd()
                handleMiddleMouseUp()
              }}
              onMouseLeave={() => {
                if (draggedColumnIndex !== null) handleDragEnd()
              }}
              onTouchMove={draggedColumnIndex !== null ? handleDragMove : undefined}
              onTouchEnd={draggedColumnIndex !== null ? handleDragEnd : undefined}
            >
              {/* Y-Axis Row Labels */}
              <div className="w-16 border-r border-white/5 flex flex-col pt-4 bg-black/40 flex-shrink-0 text-center space-y-28">
              <div className="text-[9px] font-bold text-cyan-500 -rotate-90 whitespace-nowrap origin-center">ACTIVE PICK</div>
              <div className="text-[9px] font-bold text-gray-600 -rotate-90 whitespace-nowrap origin-center">ALTERNATIVES</div>
            </div>

            {/* Columns with insert buttons */}
            <div className="flex" ref={columnsContainerRef}>
              {/* Insert button at the start */}
              <div className="flex items-start pt-2">
                <button
                  onClick={() => handleInsertTrack(0)}
                  disabled={addingTrackAtIndex !== null}
                  className={cn(
                    "w-6 h-full min-h-[180px] flex items-center justify-center transition-all group",
                    addingTrackAtIndex === 0
                      ? "bg-cyan-500/10"
                      : "hover:bg-cyan-500/5"
                  )}
                >
                  {addingTrackAtIndex === 0 ? (
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 text-gray-700 group-hover:text-cyan-400 transition-colors" />
                  )}
                </button>
              </div>

              {sessionColumns.map((col, colIdx) => (
                <div key={col.id} className="flex">
                  {/* Column */}
                  <div
                    className={cn(
                      "min-w-[200px] border-r border-white/5 flex flex-col p-2 space-y-4 transition-all",
                      draggedColumnIndex === colIdx && "opacity-50 scale-95",
                      dropTargetIndex === colIdx && draggedColumnIndex !== null && "bg-cyan-500/10 border-cyan-500/30"
                    )}
                  >
                    {/* Active Track (Rank 0) with drag handle */}
                    <div className="space-y-2">
                      <div
                        className="relative group"
                      >
                        {/* Drag Handle */}
                        <div
                          className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 cursor-grab active:cursor-grabbing p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-cyan-500/20"
                          onMouseDown={(e) => handleDragStart(e, colIdx)}
                          onTouchStart={(e) => handleDragStart(e, colIdx)}
                        >
                          <GripVertical className="w-4 h-4 text-gray-400 rotate-90" />
                        </div>

                        <div
                          className="cursor-pointer"
                          onClick={() => handleSelectTrack(col.activeTrack.track, colIdx)}
                        >
                          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-pink-500/20 rounded-xl blur opacity-25 group-hover:opacity-100 transition duration-1000" />
                          <div className={cn(
                            'relative bg-[#0a0c1c]/80 backdrop-blur-xl rounded-xl overflow-hidden border-2 p-2',
                            'border-cyan-500/40 bg-gradient-to-r from-cyan-500/10 to-transparent',
                            selectedTrack?.id === col.activeTrack.track.id && 'border-cyan-400',
                            isPlaying && playingNodeIndex === colIdx && 'border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                          )}>
                            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-900 mb-2">
                              <img
                                src={col.activeTrack.track.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop'}
                                alt={col.activeTrack.track.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (isPlaying && playingNodeIndex === colIdx) {
                                      pauseTrack()
                                    } else {
                                      playTrack(colIdx)
                                    }
                                  }}
                                  className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center hover:scale-110 transition-transform"
                                >
                                  {isPlaying && playingNodeIndex === colIdx ? (
                                    <Pause className="w-5 h-5 text-black" />
                                  ) : (
                                    <Play className="w-5 h-5 fill-black text-black ml-0.5" />
                                  )}
                                </button>
                              </div>
                              <div className="absolute bottom-1 right-1 bg-black/80 px-1 rounded text-[8px] font-mono">
                                {formatDuration(col.activeTrack.track.duration)}
                              </div>
                              {col.activeTrack.isLocked && (
                                <div className="absolute top-1 left-1 bg-cyan-500/80 p-1 rounded">
                                  <Lock className="w-3 h-3 text-black" />
                                </div>
                              )}
                              {/* AI Provider Badge */}
                              {col.activeTrack.sourceProvider && (
                                <div className="absolute top-1 right-1">
                                  <AIProviderBadge provider={col.activeTrack.sourceProvider} size="md" />
                                </div>
                              )}
                            </div>
                            <div className="px-1 overflow-hidden">
                              <div className="text-[10px] font-bold text-white truncate">{col.activeTrack.track.title}</div>
                              <div className="text-[9px] text-gray-500 truncate">{col.activeTrack.track.artist}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-1">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleLockToggle(colIdx)}
                            className={cn(
                              "w-5 h-5 rounded flex items-center justify-center transition-colors",
                              col.activeTrack.isLocked
                                ? "bg-cyan-500 text-black"
                                : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-cyan-400"
                            )}
                          >
                            <Lock className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[9px] font-bold text-gray-600 uppercase">
                          Energy: {col.activeTrack.track.energy || '?'}
                        </div>
                      </div>
                    </div>

                    {/* Alternatives */}
                    <div className="space-y-2 pt-4">
                      {col.alternatives.length > 0 ? (
                        col.alternatives.map((track) => (
                          <div
                            key={track.id}
                            className={cn(
                              'group p-2 rounded-lg bg-black/40 border border-white/5 hover:border-cyan-500/50 cursor-pointer transition-all',
                              auditioningTrack?.id === track.id && 'border-pink-500/50 bg-pink-500/5'
                            )}
                            onClick={() => handleAuditionTrack(track, colIdx)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 relative">
                                <img
                                  src={track.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop'}
                                  alt={track.title}
                                  className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <Play className="w-4 h-4 text-white fill-white" />
                                </div>
                              </div>
                              <div className="flex-1 overflow-hidden">
                                <div className="text-[9px] font-bold text-gray-400 group-hover:text-white truncate">{track.title}</div>
                                <div className="text-[8px] text-gray-600 truncate">{track.artist}</div>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-[8px] font-mono text-cyan-400">Energy: {track.energy}</span>
                                  {track.matchScore && (
                                    <span className="text-[8px] font-mono text-pink-400">{track.matchScore}% match</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {/* Why Not Chosen tooltip on hover */}
                            {track.whyNotChosen && (
                              <div className="mt-2 pt-2 border-t border-white/5">
                                <div className="flex items-center gap-1 text-[8px] text-gray-500 mb-1">
                                  <Sparkles className="w-2.5 h-2.5 text-pink-400" />
                                  <span className="uppercase font-bold tracking-wider">Why Alternative</span>
                                </div>
                                <p className="text-[8px] text-gray-400 italic leading-relaxed line-clamp-2">{track.whyNotChosen}</p>
                              </div>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSwapIn(track, colIdx); }}
                              className="mt-2 w-full opacity-0 group-hover:opacity-100 text-[8px] bg-cyan-500 text-black px-1.5 py-1 rounded font-bold uppercase transition-opacity"
                            >
                              Swap In
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-[9px] text-gray-600">
                          No alternatives
                        </div>
                      )}

                      {/* AI Generate New Button (replaces old plus button) */}
                      <button
                        onClick={() => handleGenerateNewTrack(colIdx)}
                        disabled={addingTrackAtIndex !== null}
                        className={cn(
                          "w-full py-3 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 group transition-all",
                          addingTrackAtIndex === colIdx
                            ? "border-pink-500/50 bg-pink-500/5"
                            : "border-white/5 hover:border-pink-500/30 hover:bg-pink-500/5"
                        )}
                      >
                        {addingTrackAtIndex === colIdx ? (
                          <Loader2 className="w-4 h-4 text-pink-400 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-gray-600 group-hover:text-pink-400" />
                            <span className="text-[9px] font-bold text-gray-600 group-hover:text-pink-400 uppercase tracking-wider">Generate New</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Insert button after each column */}
                  <div className="flex items-start pt-2">
                    <button
                      onClick={() => handleInsertTrack(colIdx + 1)}
                      disabled={addingTrackAtIndex !== null}
                      className={cn(
                        "w-6 h-full min-h-[180px] flex items-center justify-center transition-all group",
                        addingTrackAtIndex === colIdx + 1
                          ? "bg-cyan-500/10"
                          : "hover:bg-cyan-500/5"
                      )}
                    >
                      {addingTrackAtIndex === colIdx + 1 ? (
                        <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 text-gray-700 group-hover:text-cyan-400 transition-colors" />
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {/* Empty State - show ghost tracks while generating */}
              {sessionColumns.length === 0 && generationProgress.isGenerating && generationProgress.primaryProvider === null && (
                <div className="flex">
                  {Array.from({ length: generationProgress.skeletonCount }).map((_, index) => (
                    <div
                      key={`ghost-${index}`}
                      className="min-w-[200px] border-r border-white/5 flex flex-col p-2 space-y-4"
                    >
                      <GhostTrackCard index={index} />
                      {/* Ghost alternatives */}
                      <div className="space-y-2 pt-4">
                        <div className="h-16 bg-white/5 rounded-lg animate-pulse" />
                        <div className="h-16 bg-white/5 rounded-lg animate-pulse opacity-50" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State - no tracks and not generating */}
              {sessionColumns.length === 0 && !generationProgress.isGenerating && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-10 h-10 text-white/30" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No tracks yet</h3>
                    <p className="text-white/50 text-sm">Generate a set to see tracks in the session grid</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>

        </section>

        {/* Right Sidebar: Inspector */}
        <AnimatePresence>
          {selectedTrack ? (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-[#0a0c1c]/80 backdrop-blur-xl border-l border-white/5 flex flex-col z-40 overflow-hidden"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Clip Inspector</h2>
                <button onClick={() => setSelectedTrack(null)} className="text-gray-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                {/* Cover & Info */}
                <div className="space-y-4">
                  <div className="relative group">
                    <img
                      src={selectedTrack.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop'}
                      alt={selectedTrack.title}
                      className="w-full aspect-square rounded-2xl shadow-2xl border border-white/10 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4 rounded-2xl">
                      <div>
                        <h3 className="text-2xl font-extrabold leading-none tracking-tight">{selectedTrack.title}</h3>
                        <p className="text-gray-400 text-sm mt-1">{selectedTrack.artist}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (selectedColumnIndex !== null) {
                          if (isPlaying && playingNodeIndex === selectedColumnIndex) {
                            pauseTrack()
                          } else {
                            playTrack(selectedColumnIndex)
                          }
                        }
                      }}
                      className={cn(
                        "absolute bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform",
                        isPlaying && selectedColumnIndex !== null && playingNodeIndex === selectedColumnIndex
                          ? "bg-cyan-500 text-black"
                          : "bg-white text-black"
                      )}
                    >
                      {isPlaying && selectedColumnIndex !== null && playingNodeIndex === selectedColumnIndex ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 ml-0.5" />
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                      <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Energy</div>
                      <div className="text-lg font-bold text-cyan-400">{selectedTrack.energy || 'N/A'}</div>
                    </div>
                    <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                      <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Harmonic</div>
                      <div className="text-lg font-bold text-pink-400">{selectedTrack.key || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* AI Reasoning - show whyNotChosen for alternatives or aiReasoning for main tracks */}
                {(selectedTrack.aiReasoning || (selectedTrack as AlternativeTrack).whyNotChosen) && (
                  <div className={cn(
                    "p-4 rounded-2xl relative overflow-hidden border",
                    (selectedTrack as AlternativeTrack).whyNotChosen
                      ? "bg-pink-500/5 border-pink-500/10"
                      : "bg-cyan-500/5 border-cyan-500/10"
                  )}>
                    <div className={cn(
                      "absolute top-0 right-0 w-24 h-24 blur-3xl",
                      (selectedTrack as AlternativeTrack).whyNotChosen ? "bg-pink-400/5" : "bg-cyan-400/5"
                    )} />
                    <div className={cn(
                      "flex items-center gap-2 text-[10px] font-bold uppercase mb-3",
                      (selectedTrack as AlternativeTrack).whyNotChosen ? "text-pink-400" : "text-cyan-400"
                    )}>
                      <Sparkles className="w-3 h-3" />
                      {(selectedTrack as AlternativeTrack).whyNotChosen ? 'Why This Is An Alternative' : 'Why AI Chose This'}
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed italic">
                      {(selectedTrack as AlternativeTrack).whyNotChosen || selectedTrack.aiReasoning}
                    </p>
                    {(selectedTrack as AlternativeTrack).matchScore && (
                      <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                        <div className="flex justify-between items-center text-[9px] font-bold">
                          <span className="text-gray-500 uppercase">Match Score</span>
                          <span className="text-pink-400">{(selectedTrack as AlternativeTrack).matchScore}%</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)]"
                            style={{ width: `${(selectedTrack as AlternativeTrack).matchScore}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {!((selectedTrack as AlternativeTrack).matchScore) && selectedTrack.aiReasoning && (
                      <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                        <div className="flex justify-between items-center text-[9px] font-bold">
                          <span className="text-gray-500 uppercase">Energy Compatibility</span>
                          <span className="text-cyan-400">High (0.92)</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500 w-[92%] shadow-[0_0_8px_rgba(0,242,255,0.6)]" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Transition Analysis */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Transition Analysis</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                      <div className="w-8 h-8 rounded bg-gray-900 flex items-center justify-center text-[10px] font-bold text-gray-500">PREV</div>
                      <div className="flex-1">
                        <div className="text-[10px] font-bold">Smooth Crossfade</div>
                        <div className="text-[9px] text-green-500">Safe</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl">
                      <div className="w-8 h-8 rounded bg-gray-900 flex items-center justify-center text-[10px] font-bold text-gray-500">NEXT</div>
                      <div className="flex-1">
                        <div className="text-[10px] font-bold">Compatible</div>
                        <div className="text-[9px] text-cyan-400">Good match</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-white/5 bg-black/40">
                <button className="w-full py-4 bg-white text-black font-extrabold text-xs tracking-widest uppercase rounded-xl hover:bg-cyan-400 transition-all shadow-xl">
                  Replace Selected
                </button>
              </div>
            </motion.aside>
          ) : (
            <aside className="w-80 bg-[#0a0c1c]/80 backdrop-blur-xl border-l border-white/5 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 rounded-full border border-white/5 flex items-center justify-center mb-6">
                <Info className="w-10 h-10 text-gray-700" />
              </div>
              <h3 className="text-sm font-bold text-gray-400 uppercase mb-2">No Clip Selected</h3>
              <p className="text-xs text-gray-600">Select a committed track or alternative to view deep AI insights and transition analytics.</p>
            </aside>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Transport Bar */}
      <TransportBar />

      {/* Export Flow */}
      <ExportFlow isOpen={showExport} onClose={() => setShowExport(false)} />

      {/* Save Set Dialog */}
      <SaveSetDialog isOpen={showSaveDialog} onClose={() => setShowSaveDialog(false)} />

      {/* Browse Sets Modal */}
      <BrowseSetsModal isOpen={showBrowseSets} onClose={() => setShowBrowseSets(false)} />

      {/* Arc Mismatch Modal */}
      <AnimatePresence>
        {arcMismatchInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setArcMismatchInfo(null)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-[#0a0c1c] border border-white/10 max-w-md w-full p-8 rounded-3xl overflow-hidden"
            >
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/10 blur-[100px]" />

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tighter uppercase">Energy Mismatch</h2>
                  <p className="text-sm text-gray-500">{arcMismatchInfo.arcName} Arc</p>
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-4">
                <span className="text-orange-400 font-bold">{arcMismatchInfo.poorFitCount} track{arcMismatchInfo.poorFitCount > 1 ? 's' : ''}</span> {arcMismatchInfo.poorFitCount > 1 ? "don't" : "doesn't"} have the right energy level to match this curve.
              </p>

              <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/5">
                <div className="text-[10px] font-bold text-gray-500 uppercase mb-3">Affected Positions</div>
                <div className="flex flex-wrap gap-2">
                  {arcMismatchInfo.poorFitPositions.slice(0, 8).map((pos) => (
                    <div key={pos} className="px-3 py-1.5 bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-400 text-xs font-bold">
                      Slot {pos + 1}
                    </div>
                  ))}
                  {arcMismatchInfo.poorFitPositions.length > 8 && (
                    <div className="px-3 py-1.5 bg-white/10 rounded-lg text-gray-400 text-xs font-bold">
                      +{arcMismatchInfo.poorFitPositions.length - 8} more
                    </div>
                  )}
                </div>
              </div>

              <p className="text-gray-500 text-xs mb-6">
                We've rearranged your tracks as best as possible. Would you like to regenerate {arcMismatchInfo.poorFitCount > 1 ? 'these' : 'this'} track{arcMismatchInfo.poorFitCount > 1 ? 's' : ''} with better energy matches?
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() => setArcMismatchInfo(null)}
                  className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-white/5 hover:bg-white/10 transition-all"
                >
                  Keep As Is
                </button>
                <button
                  onClick={handleRegeneratePoorFits}
                  disabled={isRegenerating}
                  className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-black bg-cyan-500 hover:bg-cyan-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRegenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Regenerate {arcMismatchInfo.poorFitCount}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
