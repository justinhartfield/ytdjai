'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Undo2, Redo2, Download, Play, Pause,
  Lock, Unlock, Trash2, X, RefreshCw, Settings2, Sparkles, Loader2,
  Plus, Clock, Cloud, FolderOpen, Layers
} from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import { useYTDJStore, arcTemplates } from '@/store'
import { generatePlaylist, swapTrack } from '@/lib/ai-service'
import { formatTime } from './YouTubePlayer'
import { TransportBar } from './TransportBar'
import { IconSidebar } from './IconSidebar'
import { AIConstraintsDrawer } from './AIConstraintsDrawer'
import { SetsDashboard } from './SetsDashboard'
import { ExportFlow } from './ExportFlow'
import { AIControlsSidebar } from './AIControlsSidebar'
import { SaveSetDialog } from './SaveSetDialog'
import { BrowseSetsModal } from './BrowseSetsModal'
import type { PlaylistNode, Track, AIConstraints, Set, AIProvider } from '@/types'
import { GhostTrackNode, AIProviderBadge } from './GhostTrackNode'

interface ArrangementIDEProps {
  onViewChange: (view: 'arrangement' | 'session') => void
  currentView: 'arrangement' | 'session'
  onGoHome?: () => void
}

export function ArrangementIDE({ onViewChange, currentView, onGoHome }: ArrangementIDEProps) {
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
    setPlayerState,
    ui,
    setLeftSidebarPanel,
    setCurrentSet,
    constraints,
    updateNodeStartTime,
    undo,
    redo,
    canUndo,
    canRedo,
    activeArcTemplate,
    setActiveArcTemplate,
    generationProgress,
    swapWithProviderAlternative,
    combineAllProviders
  } = useYTDJStore()
  const playlist = currentSet?.playlist || []
  const [editingPrompt, setEditingPrompt] = useState(currentSet?.prompt || '')
  const [isPromptEditing, setIsPromptEditing] = useState(false)
  const [pendingArcChange, setPendingArcChange] = useState<string | null>(null)

  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number | null>(0)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragStartX, setDragStartX] = useState<number>(0)
  const [dragStartY, setDragStartY] = useState<number>(0)
  const [dragCurrentX, setDragCurrentX] = useState<number>(0)
  const [dragCurrentY, setDragCurrentY] = useState<number>(0)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const [isDraggingHorizontal, setIsDraggingHorizontal] = useState(false)
  const [isDraggingVertical, setIsDraggingVertical] = useState(false)
  const [currentDragEnergy, setCurrentDragEnergy] = useState<number | null>(null)
  const [swapPreview, setSwapPreview] = useState<Track | null>(null)
  const [isLoadingSwap, setIsLoadingSwap] = useState(false)
  const [lastFetchedEnergy, setLastFetchedEnergy] = useState<number | null>(null)
  const [energyTolerance, setEnergyTolerance] = useState(10)
  const [showExport, setShowExport] = useState(false)
  const [targetTrackCount, setTargetTrackCount] = useState(8)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showBrowseSets, setShowBrowseSets] = useState(false)
  const [isFixingTrack, setIsFixingTrack] = useState(false)

  // Player state from store
  const { isPlaying, playingNodeIndex, currentTime, duration, volume } = player
  const activeTrackIndex = playingNodeIndex ?? 0

  const canvasRef = useRef<HTMLDivElement>(null)
  const swapDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const lastDragY = useRef<number | null>(null)

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

  // Handle window events for drag (to capture events outside canvas)
  useEffect(() => {
    if (draggedIndex === null) return

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current || draggedIndex === null) return

      const rect = canvasRef.current.getBoundingClientRect()
      const deltaX = Math.abs(e.clientX - dragStartX)
      const deltaY = Math.abs(e.clientY - dragStartY)

      // Determine drag direction - horizontal for reorder, vertical for Energy
      // Only lock in direction once we've moved enough
      if (!isDraggingHorizontal && !isDraggingVertical) {
        if (deltaX > 10 && deltaX > deltaY) {
          setIsDraggingHorizontal(true)
        } else if (deltaY > 10 && deltaY > deltaX) {
          setIsDraggingVertical(true)
        }
      }

      // Update current positions for ghost
      setDragCurrentX(e.clientX)
      setDragCurrentY(e.clientY)

      if (isDraggingHorizontal) {
        // Horizontal drag - reordering
        // Calculate which position we're over
        const xPercent = ((e.clientX - rect.left) / rect.width) * 100
        let newDropIndex = 0

        for (let i = 0; i < playlist.length; i++) {
          const nodeX = ((i + 1) / (playlist.length + 1)) * 100
          if (xPercent > nodeX) {
            newDropIndex = i + 1
          }
        }

        // Don't show drop indicator at current position
        if (newDropIndex === draggedIndex || newDropIndex === draggedIndex + 1) {
          setDropTargetIndex(null)
        } else {
          setDropTargetIndex(newDropIndex)
        }
      } else if (isDraggingVertical) {
        // Vertical drag - Energy adjustment and track swap preview
        const y = ((e.clientY - rect.top) / rect.height) * 100
        const clampedY = Math.max(10, Math.min(90, y))

        // Convert Y to Energy (100 at top, 1 at bottom)
        const newEnergy = Math.round(100 - (clampedY / 100) * 99)
        setCurrentDragEnergy(newEnergy)

        // Check if Y position has stabilized (not moving much)
        const deltaY = lastDragY.current !== null ? Math.abs(e.clientY - lastDragY.current) : 0
        lastDragY.current = e.clientY

        // Clear existing debounce timer
        if (swapDebounceRef.current) {
          clearTimeout(swapDebounceRef.current)
        }

        // Only fetch if Energy changed significantly and we're not already loading
        const energyChanged = lastFetchedEnergy === null || Math.abs(newEnergy - lastFetchedEnergy) > 5

        if (energyChanged && !isLoadingSwap && deltaY < 5) {
          // Start debounce timer - fetch after 800ms of pausing
          swapDebounceRef.current = setTimeout(async () => {
            const draggedNode = playlist[draggedIndex]
            if (!draggedNode) return

            setIsLoadingSwap(true)
            setLastFetchedEnergy(newEnergy)

            try {
              const previousNode = draggedIndex > 0 ? playlist[draggedIndex - 1] : undefined
              const nextNode = draggedIndex < playlist.length - 1 ? playlist[draggedIndex + 1] : undefined

              const result = await swapTrack({
                currentTrack: draggedNode.track,
                previousTrack: previousNode?.track,
                nextTrack: nextNode?.track,
                targetEnergy: newEnergy,
                provider: aiProvider
              })

              if (result.success && result.newTrack) {
                setSwapPreview(result.newTrack)
                console.log('[Swap] Preview track loaded:', result.newTrack.artist, '-', result.newTrack.title)
              }
            } catch (error) {
              console.error('[Swap] Failed to fetch preview:', error)
            } finally {
              setIsLoadingSwap(false)
            }
          }, 800)
        }
      }
    }

    const handleWindowMouseUp = () => {
      // Clear debounce timer
      if (swapDebounceRef.current) {
        clearTimeout(swapDebounceRef.current)
        swapDebounceRef.current = null
      }

      if (draggedIndex !== null) {
        if (isDraggingHorizontal && dropTargetIndex !== null) {
          // Reorder the playlist
          const newPlaylist = [...playlist]
          const [removed] = newPlaylist.splice(draggedIndex, 1)
          const insertIndex = dropTargetIndex > draggedIndex ? dropTargetIndex - 1 : dropTargetIndex
          newPlaylist.splice(insertIndex, 0, removed)
          updatePlaylist(newPlaylist)
          setSelectedNodeIndex(insertIndex)
        } else if (isDraggingVertical) {
          if (swapPreview) {
            // Commit the actual track swap with the preview track
            const newPlaylist = [...playlist]
            newPlaylist[draggedIndex] = {
              ...newPlaylist[draggedIndex],
              track: swapPreview,
              targetEnergy: swapPreview.energy
            }
            updatePlaylist(newPlaylist)
            console.log('[Swap] Committed track swap:', swapPreview.artist, '-', swapPreview.title)
          } else if (currentDragEnergy !== null) {
            // Just update the target Energy if no swap preview available
            const newPlaylist = [...playlist]
            newPlaylist[draggedIndex] = {
              ...newPlaylist[draggedIndex],
              targetEnergy: currentDragEnergy
            }
            updatePlaylist(newPlaylist)
          }
        }
      }

      // Reset all drag state
      setDraggedIndex(null)
      setDropTargetIndex(null)
      setIsDraggingHorizontal(false)
      setIsDraggingVertical(false)
      setCurrentDragEnergy(null)
      setSwapPreview(null)
      setIsLoadingSwap(false)
      setLastFetchedEnergy(null)
      lastDragY.current = null
    }

    window.addEventListener('mousemove', handleWindowMouseMove)
    window.addEventListener('mouseup', handleWindowMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove)
      window.removeEventListener('mouseup', handleWindowMouseUp)
      // Clear debounce timer on cleanup
      if (swapDebounceRef.current) {
        clearTimeout(swapDebounceRef.current)
      }
    }
  }, [draggedIndex, dragStartX, dragStartY, isDraggingHorizontal, isDraggingVertical, currentDragEnergy, playlist, dropTargetIndex, updatePlaylist, isLoadingSwap, lastFetchedEnergy, aiProvider, swapPreview])

  // Calculate node positions based on Energy (use targetEnergy if set, otherwise track.energy)
  const nodePositions = useMemo(() => {
    return playlist.map((node, index) => {
      const x = ((index + 1) / (playlist.length + 1)) * 100
      const energy = node.targetEnergy || node.track.energy || 50
      // Map Energy (1-100) to Y position (canvas height percentage)
      const y = 100 - ((energy - 1) / 99) * 100
      return { x, y: Math.max(10, Math.min(90, y)), energy }
    })
  }, [playlist])

  // Generate SVG curve path
  const curvePath = useMemo(() => {
    if (nodePositions.length < 2) return ''
    let d = `M ${nodePositions[0].x},${nodePositions[0].y}`
    for (let i = 0; i < nodePositions.length - 1; i++) {
      const curr = nodePositions[i]
      const next = nodePositions[i + 1]
      const cpX = (curr.x + next.x) / 2
      d += ` C ${cpX},${curr.y} ${cpX},${next.y} ${next.x},${next.y}`
    }
    return d
  }, [nodePositions])

  const handleNodeDragStart = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault()
    setDraggedIndex(index)
    setSelectedNodeIndex(index)
    setDragStartX(e.clientX)
    setDragStartY(e.clientY)
    setDragCurrentX(e.clientX)
    setDragCurrentY(e.clientY)
    setIsDraggingHorizontal(false)
    setIsDraggingVertical(false)
    setCurrentDragEnergy(null)
  }, [])

  const handleLockToggle = (index: number) => {
    const newPlaylist = [...playlist]
    newPlaylist[index] = {
      ...newPlaylist[index],
      isLocked: !newPlaylist[index].isLocked
    }
    updatePlaylist(newPlaylist)
  }

  const handleRemoveTrack = (index: number) => {
    const newPlaylist = playlist.filter((_, i) => i !== index)
    updatePlaylist(newPlaylist)
    setSelectedNodeIndex(null)
  }

  // Fix It action - swap only the selected track with a style hint
  const handleFixIt = useCallback(async (styleHint: string) => {
    if (selectedNodeIndex === null || isFixingTrack) return

    const currentNode = playlist[selectedNodeIndex]
    if (!currentNode) return

    setIsFixingTrack(true)
    try {
      const previousNode = selectedNodeIndex > 0 ? playlist[selectedNodeIndex - 1] : undefined
      const nextNode = selectedNodeIndex < playlist.length - 1 ? playlist[selectedNodeIndex + 1] : undefined

      const result = await swapTrack({
        currentTrack: currentNode.track,
        previousTrack: previousNode?.track,
        nextTrack: nextNode?.track,
        targetEnergy: currentNode.targetEnergy || currentNode.track.energy,
        provider: aiProvider,
        styleHint
      })

      if (result.success && result.newTrack) {
        const newPlaylist = [...playlist]
        newPlaylist[selectedNodeIndex] = {
          ...newPlaylist[selectedNodeIndex],
          track: result.newTrack,
          targetEnergy: result.newTrack.energy
        }
        updatePlaylist(newPlaylist)
        console.log('[Fix It] Swapped track:', result.newTrack.artist, '-', result.newTrack.title)
      }
    } catch (error) {
      console.error('[Fix It] Failed to swap track:', error)
    } finally {
      setIsFixingTrack(false)
    }
  }, [selectedNodeIndex, isFixingTrack, playlist, aiProvider, updatePlaylist])

  // Sync editing prompt when currentSet.prompt changes
  useEffect(() => {
    if (currentSet?.prompt && !isPromptEditing) {
      setEditingPrompt(currentSet.prompt)
    }
  }, [currentSet?.prompt, isPromptEditing])

  const handleRegenerate = useCallback(async (overrideConstraints?: typeof constraints, promptOverride?: string) => {
    const prompt = promptOverride || currentSet?.prompt || ''
    if (!prompt.trim() || isGenerating) return

    setIsGenerating(true)
    try {
      const trackCount = playlist.length || 8
      const activeConstraints = overrideConstraints || constraints

      const result = await generatePlaylist({
        prompt,
        constraints: {
          trackCount,
          energyRange: { min: 20, max: 80 },
          // Map extended constraints to AIConstraints
          energyTolerance: activeConstraints.energyTolerance,
          syncopation: activeConstraints.syncopation,
          keyMatch: activeConstraints.keyMatch,
          artistDiversity: activeConstraints.diversity,
          discovery: activeConstraints.discovery,
          activeDecades: activeConstraints.activeDecades,
          blacklist: activeConstraints.blacklist
        } as AIConstraints,
        provider: aiProvider
      })

      if (result.success && result.playlist) {
        updateSetWithPrompt(result.playlist, prompt)
      }
    } catch (error) {
      console.error('Failed to regenerate playlist:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [currentSet?.prompt, isGenerating, playlist.length, aiProvider, constraints, updateSetWithPrompt, setIsGenerating])

  const handleRegenerateWithCount = useCallback(async (mode: 'replace' | 'append', promptOverride?: string) => {
    const prompt = promptOverride || currentSet?.prompt || ''
    if (!prompt.trim() || isGenerating) return

    setIsGenerating(true)
    try {
      const countToGenerate = mode === 'append'
        ? Math.min(targetTrackCount, 20 - playlist.length)
        : targetTrackCount

      const result = await generatePlaylist({
        prompt,
        constraints: {
          trackCount: countToGenerate,
          energyRange: { min: 20, max: 80 },
          // Include all extended constraints
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

      if (result.success && result.playlist) {
        if (mode === 'append') {
          // Append new tracks to existing playlist
          const newPlaylist = [...playlist, ...result.playlist]
          updateSetWithPrompt(newPlaylist, prompt)
        } else {
          // Replace entire playlist
          updateSetWithPrompt(result.playlist, prompt)
        }
      }
    } catch (error) {
      console.error('Failed to regenerate playlist:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [currentSet?.prompt, isGenerating, targetTrackCount, playlist, aiProvider, constraints, updateSetWithPrompt, setIsGenerating])

  // Fit songs to arc - rearrange unlocked tracks to best match the energy curve
  const handleFitToArc = useCallback((arcId: string) => {
    if (playlist.length < 2) return

    const arc = arcTemplates.find(a => a.id === arcId)
    if (!arc) return

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

    // First, place locked tracks
    lockedPositions.forEach((node, index) => {
      newPlaylist[index] = node
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
      }
    }

    updatePlaylist(newPlaylist)
  }, [playlist, updatePlaylist])

  const handleArcChange = useCallback((arcId: string) => {
    if (arcId === activeArcTemplate) return
    setPendingArcChange(arcId)
  }, [activeArcTemplate])

  const confirmArcChange = useCallback(async () => {
    if (!pendingArcChange || isGenerating) return

    const arc = arcTemplates.find(a => a.id === pendingArcChange)
    if (!arc) return

    setActiveArcTemplate(pendingArcChange)
    setPendingArcChange(null)
    setIsGenerating(true)

    try {
      // Build prompt with arc description
      const basePrompt = currentSet?.prompt || 'Create an amazing DJ set'
      const arcPrompt = `${basePrompt}. Energy arc style: ${arc.name} - create a ${arc.name.toLowerCase()} energy progression throughout the set.`

      const trackCount = playlist.length || 8
      const result = await generatePlaylist({
        prompt: arcPrompt,
        constraints: {
          trackCount,
          energyRange: { min: 20, max: 80 },
          // Include all extended constraints
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

      if (result.success && result.playlist) {
        updateSetWithPrompt(result.playlist, arcPrompt)
      }
    } catch (error) {
      console.error('Failed to regenerate with arc:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [pendingArcChange, isGenerating, currentSet?.prompt, playlist.length, aiProvider, constraints, updateSetWithPrompt, setIsGenerating])

  const selectedNode = selectedNodeIndex !== null ? playlist[selectedNodeIndex] : null
  const totalDuration = playlist.reduce((acc, node) => acc + node.track.duration, 0)

  return (
    <div className="h-full flex flex-col bg-[#05060f] overflow-hidden">
      {/* Scanline Effect */}
      <div className="fixed inset-0 pointer-events-none z-50">
        <div className="absolute w-full h-24 bg-gradient-to-b from-transparent via-cyan-500/[0.02] to-transparent animate-scanline" />
      </div>

      {/* Header / IDE Toolbar */}
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
                "p-2 transition-colors",
                canUndo() ? "text-gray-400 hover:text-cyan-400" : "text-gray-600 cursor-not-allowed"
              )}
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo()}
              className={cn(
                "p-2 transition-colors",
                canRedo() ? "text-gray-400 hover:text-cyan-400" : "text-gray-600 cursor-not-allowed"
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
          onRegenerate={handleRegenerate}
        />

        {/* Sets Dashboard Drawer */}
        <SetsDashboard
          isOpen={ui.leftSidebarPanel === 'sets'}
          onClose={() => setLeftSidebarPanel(null)}
          onSelectSet={(set: Set) => {
            setCurrentSet(set)
            setEditingPrompt(set.prompt || '')
            setLeftSidebarPanel(null)
          }}
        />

        {/* Left Sidebar: AI Controls */}
        <AIControlsSidebar
          onRegenerate={(mode, prompt) => {
            if (mode) {
              handleRegenerateWithCount(mode, prompt)
            } else {
              handleRegenerate(undefined, prompt)
            }
          }}
          onFitToArc={handleFitToArc}
          isGenerating={isGenerating}
          energyTolerance={energyTolerance}
          onEnergyToleranceChange={setEnergyTolerance}
          targetTrackCount={targetTrackCount}
          onTargetTrackCountChange={setTargetTrackCount}
        />

        {/* Center Canvas */}
        <main
          ref={canvasRef}
          className="flex-1 relative flex flex-col bg-[#070815] overflow-hidden select-none"
        >
          {/* Canvas Toolbar */}
          <div className="h-10 border-b border-white/5 flex items-center justify-between px-6 bg-black/30 z-20">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-[9px] font-bold tracking-[0.2em] text-gray-500">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_5px_rgba(0,242,255,1)]" />
                ENERGY CURVE
              </div>
              <div className="flex items-center gap-2 text-[9px] font-bold tracking-[0.2em] text-gray-500">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                TRANSITIONS
              </div>
            </div>

            {/* AI Provider Results Selector */}
            {generationProgress.providerPlaylists.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold tracking-[0.2em] text-gray-500 mr-2">AI RESULTS:</span>
                {generationProgress.providerPlaylists.map(({ provider }) => (
                  <button
                    key={provider}
                    onClick={() => swapWithProviderAlternative(provider)}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all',
                      generationProgress.primaryProvider === provider
                        ? 'bg-cyan-500 text-black'
                        : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                    )}
                    title={`Use ${provider === 'openai' ? 'OpenAI' : provider === 'claude' ? 'Claude' : 'Gemini'} results`}
                  >
                    <AIProviderBadge provider={provider} size="sm" />
                    <span>{provider === 'openai' ? 'OpenAI' : provider === 'claude' ? 'Claude' : 'Gemini'}</span>
                  </button>
                ))}
                {/* Combine All Button */}
                <button
                  onClick={() => combineAllProviders()}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-all',
                    generationProgress.primaryProvider === null
                      ? 'bg-gradient-to-r from-[#10a37f] via-[#d97706] to-[#4285f4] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                  )}
                  title="Combine tracks from all AI providers and fit to arc template"
                >
                  <Layers className="w-3 h-3" />
                  <span>Combine All</span>
                </button>
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

          {/* Grid Background */}
          <div
            className="flex-1 relative"
            style={{
              backgroundImage: 'linear-gradient(rgba(0, 242, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 255, 0.03) 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }}
          >
            {/* Y-Axis Labels */}
            <div className="absolute left-0 top-0 bottom-0 w-14 border-r border-white/5 bg-black/40 z-30 flex flex-col justify-between py-10 px-2 text-[10px] font-mono text-gray-600">
              <span>200</span>
              <span>180</span>
              <span>160</span>
              <span>140</span>
              <span>120</span>
              <span>100</span>
              <span>80</span>
              <span>60</span>
            </div>

            {/* SVG Curve */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00f2ff" />
                  <stop offset="50%" stopColor="#ff00e5" />
                  <stop offset="100%" stopColor="#00f2ff" />
                </linearGradient>
              </defs>
              {nodePositions.length > 1 && (
                <path
                  d={curvePath}
                  fill="none"
                  stroke="url(#curveGradient)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="drop-shadow-[0_0_8px_rgba(0,242,255,0.5)]"
                />
              )}
            </svg>

            {/* Drop Indicators */}
            {dropTargetIndex !== null && isDraggingHorizontal && (
              <motion.div
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                className="absolute top-0 bottom-0 w-1 bg-cyan-400 z-50 shadow-[0_0_20px_rgba(0,242,255,0.8)]"
                style={{
                  left: `${((dropTargetIndex) / (playlist.length + 1)) * 100}%`,
                  transform: 'translateX(-50%)'
                }}
              />
            )}

            {/* Ghost Track Nodes - show while waiting for primary result */}
            {generationProgress.isGenerating && generationProgress.primaryProvider === null && (
              <AnimatePresence>
                {Array.from({ length: generationProgress.skeletonCount }).map((_, index) => {
                  const x = ((index + 1) / (generationProgress.skeletonCount + 1)) * 100
                  const y = 50 // Default to middle height
                  return (
                    <GhostTrackNode
                      key={`ghost-${index}`}
                      index={index}
                      x={x}
                      y={y}
                    />
                  )
                })}
              </AnimatePresence>
            )}

            {/* Track Nodes */}
            {playlist.map((node, index) => {
              const pos = nodePositions[index]
              const isDragging = draggedIndex === index
              const isBeingReordered = isDragging && isDraggingHorizontal
              const isBeingDraggedVertical = isDragging && isDraggingVertical

              return (
                <motion.div
                  key={node.id}
                  className={cn(
                    "absolute z-40",
                    (isBeingReordered || isBeingDraggedVertical) && "z-50"
                  )}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  animate={{
                    scale: isDragging ? 1.15 : 1,
                    opacity: (isBeingReordered || isBeingDraggedVertical) ? 0.5 : 1
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <div
                    className={cn(
                      "relative group cursor-grab active:cursor-grabbing",
                      isDragging && "cursor-grabbing"
                    )}
                    onMouseDown={(e) => handleNodeDragStart(e, index)}
                    onClick={() => !isDragging && setSelectedNodeIndex(index)}
                  >
                    {/* Reorder indicator - show when dragging horizontally */}
                    <AnimatePresence>
                      {isBeingReordered && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="absolute -top-10 left-1/2 -translate-x-1/2 bg-pink-500 text-white px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider shadow-lg z-50 whitespace-nowrap"
                        >
                          Drag to reorder
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Energy adjustment indicator - show when dragging vertically */}
                    <AnimatePresence>
                      {isBeingDraggedVertical && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="absolute -top-10 left-1/2 -translate-x-1/2 bg-pink-500 text-white px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider shadow-lg z-50 whitespace-nowrap"
                        >
                          Adjust Energy
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Node Circle */}
                    <div className={cn(
                      'w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all bg-[#05060f] relative',
                      selectedNodeIndex === index ? 'border-cyan-400 shadow-[0_0_15px_rgba(0,242,255,0.4)]' : 'border-white/20 group-hover:border-white/40',
                      isPlaying && activeTrackIndex === index && 'animate-pulse',
                      isBeingReordered && 'border-pink-500 shadow-[0_0_20px_rgba(255,0,229,0.5)]',
                      isBeingDraggedVertical && 'border-pink-500 shadow-[0_0_20px_rgba(255,0,229,0.5)]'
                    )}>
                      <div className="w-12 h-12 rounded-full overflow-hidden relative">
                        <img
                          src={node.track.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop'}
                          alt={node.track.title}
                          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                          draggable={false}
                        />
                        {node.isLocked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <Lock className="w-4 h-4 text-cyan-400" />
                          </div>
                        )}
                      </div>
                      {/* AI Provider Badge */}
                      {node.sourceProvider && (
                        <div className="absolute -bottom-1 -right-1">
                          <AIProviderBadge provider={node.sourceProvider} size="sm" />
                        </div>
                      )}
                    </div>

                    {/* Floating Label */}
                    <div className={cn(
                      "absolute top-16 left-1/2 -translate-x-1/2 whitespace-nowrap text-center transition-opacity",
                      isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                      <div className="text-[10px] font-extrabold text-white uppercase tracking-tighter">{node.track.title}</div>
                      <div className="text-[8px] font-bold text-gray-500 uppercase">{node.track.artist}</div>
                    </div>
                  </div>
                </motion.div>
              )
            })}

            {/* Ghost Preview - follows cursor when dragging horizontally */}
            <AnimatePresence>
              {draggedIndex !== null && isDraggingHorizontal && canvasRef.current && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 0.8, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="fixed z-[100] pointer-events-none"
                  style={{
                    left: dragCurrentX,
                    top: canvasRef.current.getBoundingClientRect().top + canvasRef.current.getBoundingClientRect().height / 2,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="w-16 h-16 rounded-full border-2 border-cyan-400 bg-[#05060f] shadow-[0_0_30px_rgba(0,242,255,0.6)] flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full overflow-hidden">
                      <img
                        src={playlist[draggedIndex]?.track.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop'}
                        alt=""
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                  </div>
                  <div className="absolute top-18 left-1/2 -translate-x-1/2 whitespace-nowrap text-center mt-2">
                    <div className="text-[10px] font-extrabold text-white uppercase tracking-tighter bg-black/80 px-2 py-1 rounded">
                      {playlist[draggedIndex]?.track.title}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Ghost Preview - follows cursor when dragging vertically (Energy adjustment/Track swap) */}
            <AnimatePresence>
              {draggedIndex !== null && isDraggingVertical && canvasRef.current && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 0.9, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="fixed z-[100] pointer-events-none"
                  style={{
                    left: canvasRef.current.getBoundingClientRect().left + (nodePositions[draggedIndex]?.x / 100) * canvasRef.current.getBoundingClientRect().width,
                    top: dragCurrentY,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  {/* Show swap preview track or original track */}
                  <div className={cn(
                    "w-16 h-16 rounded-full border-2 bg-[#05060f] shadow-[0_0_30px] flex items-center justify-center transition-all duration-300",
                    swapPreview
                      ? "border-green-500 shadow-green-500/60"
                      : "border-pink-500 shadow-pink-500/60"
                  )}>
                    <div className="w-14 h-14 rounded-full overflow-hidden relative">
                      {isLoadingSwap ? (
                        <div className="w-full h-full flex items-center justify-center bg-black/80">
                          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                        </div>
                      ) : (
                        <img
                          src={swapPreview?.thumbnail || playlist[draggedIndex]?.track.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop'}
                          alt=""
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      )}
                    </div>
                  </div>

                  {/* Energy indicator */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg font-black text-lg shadow-2xl whitespace-nowrap transition-colors",
                      swapPreview ? "bg-green-500 text-black" : "bg-pink-500 text-white"
                    )}
                  >
                    {swapPreview?.energy || currentDragEnergy}<span className="text-[10px] ml-1 font-bold">Energy</span>
                  </motion.div>

                  {/* Track info */}
                  <div className="absolute top-18 left-1/2 -translate-x-1/2 whitespace-nowrap text-center mt-2">
                    {isLoadingSwap ? (
                      <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider bg-black/80 px-3 py-1.5 rounded flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Finding track...
                      </div>
                    ) : swapPreview ? (
                      <div className="bg-green-500/20 border border-green-500/30 px-3 py-1.5 rounded">
                        <div className="text-[10px] font-extrabold text-white uppercase tracking-tighter">
                          {swapPreview.title}
                        </div>
                        <div className="text-[8px] font-bold text-green-400 uppercase">
                          {swapPreview.artist}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-black/80 px-2 py-1 rounded">
                        <div className="text-[10px] font-extrabold text-white uppercase tracking-tighter">
                          {playlist[draggedIndex]?.track.title}
                        </div>
                        <div className="text-[8px] font-bold text-pink-400 uppercase">
                          Pause to find track
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </main>

        {/* Right Sidebar: Inspector */}
        <AnimatePresence>
          {selectedNode && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-[#0a0c1c]/80 backdrop-blur-xl border-l border-white/5 flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Track Inspector</h2>
                <button onClick={() => setSelectedNodeIndex(null)} className="text-gray-600 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                {/* Track Details */}
                <div className="space-y-4">
                  <div className="relative group">
                    <img
                      src={selectedNode.track.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop'}
                      alt={selectedNode.track.title}
                      className="w-full aspect-square rounded-2xl object-cover shadow-2xl border border-white/10"
                    />
                    <button
                      onClick={() => {
                        if (isPlaying && playingNodeIndex === selectedNodeIndex) {
                          pauseTrack()
                        } else if (selectedNodeIndex !== null) {
                          playTrack(selectedNodeIndex)
                        }
                      }}
                      className={cn(
                        "absolute bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform",
                        isPlaying && playingNodeIndex === selectedNodeIndex
                          ? "bg-cyan-500 text-black"
                          : "bg-white text-black"
                      )}
                    >
                      {isPlaying && playingNodeIndex === selectedNodeIndex ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 ml-0.5" />
                      )}
                    </button>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tighter">{selectedNode.track.title}</h3>
                    <p className="text-cyan-400 text-sm font-bold uppercase tracking-widest">{selectedNode.track.artist}</p>
                    {selectedNode.sourceProvider && (
                      <p className="text-[10px] text-gray-500 mt-1">
                        Generated by <span className="font-semibold">{selectedNode.sourceProvider}</span>
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="text-[8px] font-bold text-gray-500 uppercase mb-1">Energy</div>
                      <div className="text-lg font-black text-white">{selectedNode.track.energy || 'N/A'}</div>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="text-[8px] font-bold text-gray-500 uppercase mb-1">Key</div>
                      <div className="text-lg font-black text-pink-500">{selectedNode.track.key || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Start Time Control */}
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Start Time
                  </h4>
                  <p className="text-[10px] text-gray-500">Skip intro and start playback at a specific time</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max={selectedNode.track.duration || 300}
                      value={selectedNode.startTime || 0}
                      onChange={(e) => {
                        if (selectedNodeIndex !== null) {
                          updateNodeStartTime(selectedNodeIndex, parseInt(e.target.value))
                        }
                      }}
                      className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="text-sm font-mono text-white min-w-[50px] text-right">
                      {formatTime(selectedNode.startTime || 0)}
                    </div>
                  </div>
                  {(selectedNode.startTime || 0) > 0 && (
                    <button
                      onClick={() => {
                        if (selectedNodeIndex !== null) {
                          updateNodeStartTime(selectedNodeIndex, 0)
                        }
                      }}
                      className="text-[10px] text-gray-500 hover:text-white transition-colors"
                    >
                      Reset to beginning
                    </button>
                  )}
                </div>

                {/* AI Reasoning */}
                {selectedNode.track.aiReasoning && (
                  <div className="bg-cyan-500/5 rounded-2xl p-5 border border-cyan-500/10 space-y-3">
                    <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles className="w-3 h-3" />
                      AI Selection Logic
                    </h4>
                    <p className="text-xs text-gray-300 leading-relaxed italic">
                      {selectedNode.track.aiReasoning}
                    </p>
                  </div>
                )}

                {/* Fix It Actions */}
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    {isFixingTrack ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    Fix It
                  </h4>
                  <p className="text-[10px] text-gray-500">Replace this track with something...</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleFixIt('more upbeat and energetic')}
                      disabled={isFixingTrack}
                      className="px-3 py-2 bg-pink-500/10 text-pink-400 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-pink-500/20 transition-all border border-pink-500/20 disabled:opacity-50"
                    >
                      More upbeat
                    </button>
                    <button
                      onClick={() => handleFixIt('more underground and less mainstream')}
                      disabled={isFixingTrack}
                      className="px-3 py-2 bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-purple-500/20 transition-all border border-purple-500/20 disabled:opacity-50"
                    >
                      More underground
                    </button>
                    <button
                      onClick={() => handleFixIt('more cohesive with better flow to surrounding tracks')}
                      disabled={isFixingTrack}
                      className="px-3 py-2 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-cyan-500/20 transition-all border border-cyan-500/20 disabled:opacity-50"
                    >
                      More cohesive
                    </button>
                    <button
                      onClick={() => handleFixIt('more variety, different style or era')}
                      disabled={isFixingTrack}
                      className="px-3 py-2 bg-orange-500/10 text-orange-400 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-orange-500/20 transition-all border border-orange-500/20 disabled:opacity-50"
                    >
                      More variety
                    </button>
                    <button
                      onClick={() => handleFixIt('more guitar-driven and rock-influenced')}
                      disabled={isFixingTrack}
                      className="px-3 py-2 bg-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-green-500/20 transition-all border border-green-500/20 disabled:opacity-50"
                    >
                      More guitars
                    </button>
                  </div>
                </div>

                {/* Lock Controls */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={() => handleLockToggle(selectedNodeIndex!)}
                    className={cn(
                      'flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2',
                      selectedNode.isLocked ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'
                    )}
                  >
                    {selectedNode.isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    {selectedNode.isLocked ? 'Unlock Track' : 'Lock Track'}
                  </button>
                  <button
                    onClick={() => handleRemoveTrack(selectedNodeIndex!)}
                    className="px-4 py-3 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all border border-red-500/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Transport Bar */}
      <TransportBar />

      {/* Arc Change Confirmation Modal */}
      <AnimatePresence>
        {pendingArcChange && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setPendingArcChange(null)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-[#0a0c1c] border border-white/10 max-w-md w-full p-8 rounded-3xl overflow-hidden"
            >
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-pink-500/10 blur-[100px]" />

              <h2 className="text-2xl font-black tracking-tighter mb-2 uppercase">Change Arc Template?</h2>
              <p className="text-gray-400 text-sm mb-6">
                This will regenerate your entire set with the <span className="text-cyan-400 font-bold">{arcTemplates.find(a => a.id === pendingArcChange)?.name}</span> energy arc. Your current tracks will be replaced.
              </p>

              {/* Preview the arc */}
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-6">
                <svg className="w-full h-12" viewBox="0 0 100 30">
                  <path
                    d={arcTemplates.find(a => a.id === pendingArcChange)?.svgPath}
                    fill="none"
                    stroke="#00f2ff"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setPendingArcChange(null)}
                  className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-white/5 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmArcChange}
                  disabled={isGenerating}
                  className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-black bg-cyan-500 hover:bg-cyan-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Regenerate
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Flow */}
      <ExportFlow isOpen={showExport} onClose={() => setShowExport(false)} />

      {/* Save Set Dialog */}
      <SaveSetDialog isOpen={showSaveDialog} onClose={() => setShowSaveDialog(false)} />

      {/* Browse Sets Modal */}
      <BrowseSetsModal isOpen={showBrowseSets} onClose={() => setShowBrowseSets(false)} />
    </div>
  )
}
