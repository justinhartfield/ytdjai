'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Undo2, Redo2, Download, Play, Pause, SkipBack, SkipForward,
  Lock, Unlock, Trash2, X, RefreshCw, Settings2, Sparkles, Loader2,
  Volume2, VolumeX, Plus, Clock, Cloud, FolderOpen
} from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { generatePlaylist, swapTrack } from '@/lib/ai-service'
import { formatTime } from './YouTubePlayer'
import { IconSidebar } from './IconSidebar'
import { AIConstraintsDrawer } from './AIConstraintsDrawer'
import { SetsDashboard } from './SetsDashboard'
import { ExportFlow } from './ExportFlow'
import { AIControlsSidebar } from './AIControlsSidebar'
import { SaveSetDialog } from './SaveSetDialog'
import { BrowseSetsModal } from './BrowseSetsModal'
import type { PlaylistNode, Track, AIConstraints, Set } from '@/types'

const ARC_TEMPLATES = [
  { id: 'warmup', name: 'Warm-up Peak', svg: 'M0,25 Q50,5 100,25' },
  { id: 'burn', name: 'Slow Burn', svg: 'M0,28 L100,5' },
  { id: 'valley', name: 'The Valley', svg: 'M0,5 Q50,28 100,5' },
  { id: 'chaos', name: 'Pulse Chaos', svg: 'M0,15 L20,5 L40,25 L60,10 L80,28 L100,15' }
]

interface ArrangementIDEProps {
  onViewChange: (view: 'arrangement' | 'session') => void
  currentView: 'arrangement' | 'session'
}

export function ArrangementIDE({ onViewChange, currentView }: ArrangementIDEProps) {
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
    setActiveArcTemplate
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
  const [currentDragBpm, setCurrentDragBpm] = useState<number | null>(null)
  const [swapPreview, setSwapPreview] = useState<Track | null>(null)
  const [isLoadingSwap, setIsLoadingSwap] = useState(false)
  const [lastFetchedBpm, setLastFetchedBpm] = useState<number | null>(null)
  const [bpmTolerance, setBpmTolerance] = useState(5)
  const [showExport, setShowExport] = useState(false)
  const [targetTrackCount, setTargetTrackCount] = useState(8)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showBrowseSets, setShowBrowseSets] = useState(false)

  // Player state from store
  const { isPlaying, playingNodeIndex, currentTime, duration, volume } = player
  const activeTrackIndex = playingNodeIndex ?? 0

  const canvasRef = useRef<HTMLDivElement>(null)
  const swapDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const lastDragY = useRef<number | null>(null)

  // Handle window events for drag (to capture events outside canvas)
  useEffect(() => {
    if (draggedIndex === null) return

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current || draggedIndex === null) return

      const rect = canvasRef.current.getBoundingClientRect()
      const deltaX = Math.abs(e.clientX - dragStartX)
      const deltaY = Math.abs(e.clientY - dragStartY)

      // Determine drag direction - horizontal for reorder, vertical for BPM
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
        // Vertical drag - BPM adjustment and track swap preview
        const y = ((e.clientY - rect.top) / rect.height) * 100
        const clampedY = Math.max(10, Math.min(90, y))

        // Convert Y to BPM (200 at top, 60 at bottom)
        const newBpm = Math.round(200 - (clampedY / 100) * 140)
        setCurrentDragBpm(newBpm)

        // Check if Y position has stabilized (not moving much)
        const deltaY = lastDragY.current !== null ? Math.abs(e.clientY - lastDragY.current) : 0
        lastDragY.current = e.clientY

        // Clear existing debounce timer
        if (swapDebounceRef.current) {
          clearTimeout(swapDebounceRef.current)
        }

        // Only fetch if BPM changed significantly and we're not already loading
        const bpmChanged = lastFetchedBpm === null || Math.abs(newBpm - lastFetchedBpm) > 5

        if (bpmChanged && !isLoadingSwap && deltaY < 5) {
          // Start debounce timer - fetch after 800ms of pausing
          swapDebounceRef.current = setTimeout(async () => {
            const draggedNode = playlist[draggedIndex]
            if (!draggedNode) return

            setIsLoadingSwap(true)
            setLastFetchedBpm(newBpm)

            try {
              const previousNode = draggedIndex > 0 ? playlist[draggedIndex - 1] : undefined
              const nextNode = draggedIndex < playlist.length - 1 ? playlist[draggedIndex + 1] : undefined

              const result = await swapTrack({
                currentTrack: draggedNode.track,
                previousTrack: previousNode?.track,
                nextTrack: nextNode?.track,
                targetBpm: newBpm,
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
              targetBpm: swapPreview.bpm
            }
            updatePlaylist(newPlaylist)
            console.log('[Swap] Committed track swap:', swapPreview.artist, '-', swapPreview.title)
          } else if (currentDragBpm !== null) {
            // Just update the target BPM if no swap preview available
            const newPlaylist = [...playlist]
            newPlaylist[draggedIndex] = {
              ...newPlaylist[draggedIndex],
              targetBpm: currentDragBpm
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
      setCurrentDragBpm(null)
      setSwapPreview(null)
      setIsLoadingSwap(false)
      setLastFetchedBpm(null)
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
  }, [draggedIndex, dragStartX, dragStartY, isDraggingHorizontal, isDraggingVertical, currentDragBpm, playlist, dropTargetIndex, updatePlaylist, isLoadingSwap, lastFetchedBpm, aiProvider, swapPreview])

  // Calculate node positions based on BPM (use targetBpm if set, otherwise track.bpm)
  const nodePositions = useMemo(() => {
    return playlist.map((node, index) => {
      const x = ((index + 1) / (playlist.length + 1)) * 100
      const bpm = node.targetBpm || node.track.bpm || 120
      // Map BPM (60-200) to Y position (canvas height percentage)
      const y = 100 - ((bpm - 60) / 140) * 100
      return { x, y: Math.max(10, Math.min(90, y)), bpm }
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
    setCurrentDragBpm(null)
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

  // Sync editing prompt when currentSet.prompt changes
  useEffect(() => {
    if (currentSet?.prompt && !isPromptEditing) {
      setEditingPrompt(currentSet.prompt)
    }
  }, [currentSet?.prompt, isPromptEditing])

  const handleRegenerate = useCallback(async (overrideConstraints?: typeof constraints) => {
    const prompt = currentSet?.prompt || ''
    if (!prompt.trim() || isGenerating) return

    setIsGenerating(true)
    try {
      const trackCount = playlist.length || 8
      const activeConstraints = overrideConstraints || constraints

      const result = await generatePlaylist({
        prompt,
        constraints: {
          trackCount,
          bpmRange: { min: 80, max: 160 },
          // Map extended constraints to AIConstraints
          bpmTolerance: activeConstraints.bpmTolerance,
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

  const handleRegenerateWithCount = useCallback(async (mode: 'replace' | 'append') => {
    const prompt = currentSet?.prompt || ''
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
          bpmRange: { min: 80, max: 160 },
          // Include all extended constraints
          bpmTolerance: constraints.bpmTolerance,
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

  const handleArcChange = useCallback((arcId: string) => {
    if (arcId === activeArcTemplate) return
    setPendingArcChange(arcId)
  }, [activeArcTemplate])

  const confirmArcChange = useCallback(async () => {
    if (!pendingArcChange || isGenerating) return

    const arc = ARC_TEMPLATES.find(a => a.id === pendingArcChange)
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
          bpmRange: { min: 80, max: 160 },
          // Include all extended constraints
          bpmTolerance: constraints.bpmTolerance,
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
        <IconSidebar />

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
          onRegenerate={(mode) => {
            if (mode) {
              handleRegenerateWithCount(mode)
            } else {
              handleRegenerate()
            }
          }}
          isGenerating={isGenerating}
          bpmTolerance={bpmTolerance}
          onBpmToleranceChange={setBpmTolerance}
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
                TEMPO CURVE
              </div>
              <div className="flex items-center gap-2 text-[9px] font-bold tracking-[0.2em] text-gray-500">
                <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                TRANSITIONS
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[9px] font-bold tracking-widest">
                AUTO-SMOOTH
              </button>
            </div>
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

                    {/* BPM adjustment indicator - show when dragging vertically */}
                    <AnimatePresence>
                      {isBeingDraggedVertical && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="absolute -top-10 left-1/2 -translate-x-1/2 bg-pink-500 text-white px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider shadow-lg z-50 whitespace-nowrap"
                        >
                          Adjust BPM
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Node Circle */}
                    <div className={cn(
                      'w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all bg-[#05060f]',
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

            {/* Ghost Preview - follows cursor when dragging vertically (BPM adjustment/Track swap) */}
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

                  {/* BPM indicator */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg font-black text-lg shadow-2xl whitespace-nowrap transition-colors",
                      swapPreview ? "bg-green-500 text-black" : "bg-pink-500 text-white"
                    )}
                  >
                    {swapPreview?.bpm || currentDragBpm}<span className="text-[10px] ml-1 font-bold">BPM</span>
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

          {/* Transport Bar */}
          <footer className="h-24 bg-[#0a0c1c]/80 backdrop-blur-xl border-t border-white/5 flex items-center px-8 gap-12 relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />

            {/* Playback Controls */}
            <div className="flex items-center gap-6">
              <button
                onClick={skipPrevious}
                disabled={playingNodeIndex === null || playingNodeIndex <= 0}
                className="text-gray-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <SkipBack className="w-6 h-6" />
              </button>
              <button
                onClick={() => {
                  if (isPlaying) {
                    pauseTrack()
                  } else if (playingNodeIndex !== null) {
                    playTrack(playingNodeIndex)
                  } else if (playlist.length > 0) {
                    playTrack(0)
                  }
                }}
                disabled={playlist.length === 0}
                className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
              </button>
              <button
                onClick={skipNext}
                disabled={playingNodeIndex === null || playingNodeIndex >= playlist.length - 1}
                className="text-gray-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <SkipForward className="w-6 h-6" />
              </button>
            </div>

            {/* Progress Section */}
            <div className="flex-1 space-y-3">
              <div className="flex justify-between items-center text-[10px] font-mono tracking-widest text-gray-500">
                <div className="flex items-center gap-4">
                  <span className="text-cyan-400 font-black">
                    {isPlaying || playingNodeIndex !== null ? (
                      <>PLAYING: {playlist[activeTrackIndex]?.track.title || 'No track'}</>
                    ) : (
                      'Ready to play'
                    )}
                  </span>
                  {(isPlaying || playingNodeIndex !== null) && (
                    <>
                      <span>•</span>
                      <span>{playlist[activeTrackIndex]?.track.bpm || 120} BPM</span>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <span className="text-white">{formatTime(currentTime)}</span> / <span>{duration > 0 ? formatTime(duration) : formatDuration(totalDuration)}</span>
                </div>
              </div>
              <div
                className="h-1 bg-white/5 rounded-full relative overflow-hidden group cursor-pointer"
                onClick={(e) => {
                  if (duration > 0) {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const percent = (e.clientX - rect.left) / rect.width
                    setPlayerState({ currentTime: percent * duration })
                  }
                }}
              >
                <div
                  className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-cyan-400 to-pink-500 shadow-[0_0_15px_rgba(0,242,255,0.5)] transition-all"
                  style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                />
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPlayerState({ volume: volume > 0 ? 0 : 80 })}
                className="text-gray-500 hover:text-white transition-colors"
              >
                {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setPlayerState({ volume: parseInt(e.target.value) })}
                className="w-20 accent-cyan-500"
              />
            </div>
          </footer>
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
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="text-[8px] font-bold text-gray-500 uppercase mb-1">BPM</div>
                      <div className="text-lg font-black text-white">{selectedNode.track.bpm || 'N/A'}</div>
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
                This will regenerate your entire set with the <span className="text-cyan-400 font-bold">{ARC_TEMPLATES.find(a => a.id === pendingArcChange)?.name}</span> energy arc. Your current tracks will be replaced.
              </p>

              {/* Preview the arc */}
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-6">
                <svg className="w-full h-12" viewBox="0 0 100 30">
                  <path
                    d={ARC_TEMPLATES.find(a => a.id === pendingArcChange)?.svg}
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
