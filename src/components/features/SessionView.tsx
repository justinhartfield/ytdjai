'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Undo2, Redo2, Download, Play, Pause, SkipBack, SkipForward,
  Lock, X, RefreshCw, Plus, Sparkles, Info, Loader2, Shuffle
} from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import { useYTDJStore, arcTemplates } from '@/store'
import { generatePlaylist } from '@/lib/ai-service'
import { IconSidebar } from './IconSidebar'
import { AIConstraintsDrawer } from './AIConstraintsDrawer'
import { SetsDashboard } from './SetsDashboard'
import { ExportFlow } from './ExportFlow'
import { AIControlsSidebar } from './AIControlsSidebar'
import type { PlaylistNode, Track, Set, AIConstraints } from '@/types'

// Local ARC_TEMPLATES that matches the store format
const ARC_TEMPLATES = [
  { id: 'warmup', name: 'Warm-up Peak', svg: 'M0,25 Q50,5 100,25' },
  { id: 'burn', name: 'Slow Burn', svg: 'M0,28 L100,5' },
  { id: 'valley', name: 'The Valley', svg: 'M0,5 Q50,28 100,5' },
  { id: 'chaos', name: 'Pulse Chaos', svg: 'M0,15 L20,5 L40,25 L60,10 L80,28 L100,15' }
]

interface SessionViewProps {
  onViewChange: (view: 'arrangement' | 'session') => void
  currentView: 'arrangement' | 'session'
}

interface SessionColumn {
  id: string
  targetBpm: number
  activeTrack: PlaylistNode
  alternatives: Track[]
}

export function SessionView({ onViewChange, currentView }: SessionViewProps) {
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
    activeArcTemplate
  } = useYTDJStore()
  const playlist = currentSet?.playlist || []

  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null)
  const [auditioningTrack, setAuditioningTrack] = useState<Track | null>(null)
  const [showExport, setShowExport] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isSmoothing, setIsSmoothing] = useState(false)
  const [addingTrackAtIndex, setAddingTrackAtIndex] = useState<number | null>(null)
  const [bpmTolerance, setBpmTolerance] = useState(5)
  const [targetTrackCount, setTargetTrackCount] = useState(8)

  // Player state from store
  const { isPlaying, playingNodeIndex, currentTime, duration } = player
  const activeTrackIndex = playingNodeIndex ?? 0

  // Get the current arc template
  const currentArc = ARC_TEMPLATES.find(arc => arc.id === activeArcTemplate) || ARC_TEMPLATES[0]

  // Convert playlist to session columns
  const sessionColumns: SessionColumn[] = useMemo(() => {
    return playlist.map((node, index) => ({
      id: node.id,
      targetBpm: node.targetBpm || node.track.bpm || 120,
      activeTrack: node,
      alternatives: [] // TODO: Could be populated from AI suggestions
    }))
  }, [playlist])

  const totalDuration = playlist.reduce((acc, node) => acc + node.track.duration, 0)

  const handleSelectTrack = (track: Track, columnIndex: number) => {
    setSelectedTrack(track)
    setSelectedColumnIndex(columnIndex)
  }

  const handleAuditionTrack = (track: Track, columnIndex: number) => {
    setAuditioningTrack(track)
    setSelectedTrack(track)
    setSelectedColumnIndex(columnIndex)
  }

  const handleSwapIn = useCallback((track: Track, columnIndex: number) => {
    const newPlaylist = [...playlist]
    newPlaylist[columnIndex] = {
      ...newPlaylist[columnIndex],
      track
    }
    updatePlaylist(newPlaylist)
    setSelectedTrack(track)
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
  const handleRegenerateGrid = useCallback(async () => {
    if (isRegenerating || !currentSet?.prompt) return

    setIsRegenerating(true)
    try {
      const result = await generatePlaylist({
        prompt: currentSet.prompt,
        constraints: {
          trackCount: playlist.length || 8,
          bpmRange: { min: 80, max: 160 },
          bpmTolerance: constraints.bpmTolerance,
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
        updateSetWithPrompt(newPlaylist, currentSet.prompt)
      }
    } catch (error) {
      console.error('Failed to regenerate grid:', error)
    } finally {
      setIsRegenerating(false)
    }
  }, [isRegenerating, currentSet, playlist, constraints, aiProvider, updateSetWithPrompt])

  // Global Ops: Auto-Smooth Transitions
  const handleAutoSmooth = useCallback(() => {
    if (isSmoothing || playlist.length < 2) return

    setIsSmoothing(true)
    try {
      // Sort tracks by BPM to create smooth transitions
      const unlockedWithIndex = playlist
        .map((node, index) => ({ node, index, isLocked: node.isLocked }))
        .filter(item => !item.isLocked)

      const lockedPositions = playlist
        .map((node, index) => ({ node, index }))
        .filter(item => item.node.isLocked)

      // Get BPMs of locked tracks to understand constraints
      const lockedBpms = lockedPositions.map(item => ({
        index: item.index,
        bpm: item.node.targetBpm || item.node.track.bpm || 120
      }))

      // Sort unlocked tracks by BPM
      unlockedWithIndex.sort((a, b) => {
        const bpmA = a.node.targetBpm || a.node.track.bpm || 120
        const bpmB = b.node.targetBpm || b.node.track.bpm || 120
        return bpmA - bpmB
      })

      // Rebuild playlist with smooth BPM progression
      const newPlaylist = [...playlist]
      let unlockedIdx = 0

      for (let i = 0; i < newPlaylist.length; i++) {
        if (!newPlaylist[i].isLocked && unlockedIdx < unlockedWithIndex.length) {
          newPlaylist[i] = unlockedWithIndex[unlockedIdx].node
          unlockedIdx++
        }
      }

      updatePlaylist(newPlaylist)
    } catch (error) {
      console.error('Failed to smooth transitions:', error)
    } finally {
      setIsSmoothing(false)
    }
  }, [isSmoothing, playlist, updatePlaylist])

  // Global Ops: Randomize Unlocked
  const handleRandomizeUnlocked = useCallback(() => {
    const unlockedIndices = playlist
      .map((node, index) => ({ node, index }))
      .filter(item => !item.node.isLocked)
      .map(item => item.index)

    if (unlockedIndices.length < 2) return

    // Fisher-Yates shuffle for unlocked tracks
    const newPlaylist = [...playlist]
    const unlockedNodes = unlockedIndices.map(i => newPlaylist[i])

    for (let i = unlockedNodes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unlockedNodes[i], unlockedNodes[j]] = [unlockedNodes[j], unlockedNodes[i]]
    }

    unlockedIndices.forEach((originalIndex, i) => {
      newPlaylist[originalIndex] = unlockedNodes[i]
    })

    updatePlaylist(newPlaylist)
  }, [playlist, updatePlaylist])

  // Add track at specific position
  const handleAddTrack = useCallback(async (columnIndex: number) => {
    if (addingTrackAtIndex !== null) return

    setAddingTrackAtIndex(columnIndex)
    try {
      const result = await generatePlaylist({
        prompt: currentSet?.prompt || 'Add a track that fits the set',
        constraints: {
          trackCount: 1,
          bpmRange: { min: 80, max: 160 }
        } as AIConstraints,
        provider: aiProvider
      })

      if (result.success && result.playlist && result.playlist.length > 0) {
        const newTrack = result.playlist[0]
        const newPlaylist = [...playlist]
        // Insert after the column index
        newPlaylist.splice(columnIndex + 1, 0, newTrack)
        updatePlaylist(newPlaylist)
      }
    } catch (error) {
      console.error('Failed to add track:', error)
    } finally {
      setAddingTrackAtIndex(null)
    }
  }, [addingTrackAtIndex, currentSet, playlist, aiProvider, updatePlaylist])

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
            <span className="text-sm font-bold text-cyan-400">{currentSet?.name || 'Untitled Set'}</span>
          </div>
          <button
            onClick={() => setShowExport(true)}
            className="px-6 py-2 bg-white text-black text-xs font-black rounded hover:bg-cyan-400 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] uppercase tracking-widest"
          >
            Export Set
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Icon Sidebar */}
        <IconSidebar />

        {/* AI Constraints Drawer */}
        <AIConstraintsDrawer
          isOpen={ui.leftSidebarPanel === 'constraints'}
          onClose={() => setLeftSidebarPanel(null)}
          onRegenerate={handleRegenerateGrid}
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
          onRegenerate={() => handleRegenerateGrid()}
          onAutoSmooth={handleAutoSmooth}
          onRandomizeUnlocked={handleRandomizeUnlocked}
          isGenerating={isRegenerating}
          isSmoothing={isSmoothing}
          bpmTolerance={bpmTolerance}
          onBpmToleranceChange={setBpmTolerance}
          targetTrackCount={targetTrackCount}
          onTargetTrackCountChange={setTargetTrackCount}
        />

        {/* Center Canvas: Session Grid */}
        <section className="flex-1 relative flex flex-col overflow-hidden bg-[#070815]" style={{
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}>
          {/* Session Header Labels */}
          <div className="h-10 border-b border-white/5 flex items-center bg-black/60 z-10">
            <div className="w-16 border-r border-white/5 flex items-center justify-center">
              <span className="text-[9px] font-bold text-gray-600">SLOT</span>
            </div>
            <div className="flex overflow-x-auto custom-scrollbar flex-1">
              {sessionColumns.map((col, index) => (
                <div
                  key={col.id}
                  className="min-w-[200px] flex-shrink-0 border-r border-white/5 px-4 flex items-center justify-between"
                >
                  <span className="text-[10px] font-bold text-cyan-400">{String(index + 1).padStart(2, '0')}</span>
                  <span className="text-[9px] font-mono text-gray-500">{col.targetBpm} BPM</span>
                </div>
              ))}
            </div>
          </div>

          {/* The Grid */}
          <div className="flex-1 flex overflow-x-auto custom-scrollbar relative z-10">
            {/* Y-Axis Row Labels */}
            <div className="w-16 border-r border-white/5 flex flex-col pt-4 bg-black/40 flex-shrink-0 text-center space-y-28">
              <div className="text-[9px] font-bold text-cyan-500 -rotate-90 whitespace-nowrap origin-center">ACTIVE PICK</div>
              <div className="text-[9px] font-bold text-gray-600 -rotate-90 whitespace-nowrap origin-center">ALTERNATIVES</div>
            </div>

            {/* Columns */}
            <div className="flex">
              {sessionColumns.map((col, colIdx) => (
                <div key={col.id} className="min-w-[200px] border-r border-white/5 flex flex-col p-2 space-y-4">
                  {/* Active Track (Rank 0) */}
                  <div className="space-y-2">
                    <div
                      className="relative group cursor-pointer"
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
                        </div>
                        <div className="px-1 overflow-hidden">
                          <div className="text-[10px] font-bold text-white truncate">{col.activeTrack.track.title}</div>
                          <div className="text-[9px] text-gray-500 truncate">{col.activeTrack.track.artist}</div>
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
                        {col.activeTrack.track.bpm || '?'} BPM
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
                                <span className="text-[8px] font-mono text-cyan-400">{track.bpm} BPM</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSwapIn(track, colIdx); }}
                                  className="opacity-0 group-hover:opacity-100 text-[8px] bg-cyan-500 text-black px-1.5 py-0.5 rounded font-bold uppercase"
                                >
                                  Launch
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-[9px] text-gray-600">
                        No alternatives
                      </div>
                    )}

                    {/* Functional Plus Button */}
                    <button
                      onClick={() => handleAddTrack(colIdx)}
                      disabled={addingTrackAtIndex !== null}
                      className={cn(
                        "w-full py-4 rounded-lg border-2 border-dashed flex items-center justify-center group transition-all",
                        addingTrackAtIndex === colIdx
                          ? "border-cyan-500/50 bg-cyan-500/5"
                          : "border-white/5 hover:border-cyan-500/30 hover:bg-cyan-500/5"
                      )}
                    >
                      {addingTrackAtIndex === colIdx ? (
                        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                      ) : (
                        <Plus className="w-5 h-5 text-gray-600 group-hover:text-cyan-400" />
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {/* Empty State */}
              {sessionColumns.length === 0 && (
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
                      <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Actual BPM</div>
                      <div className="text-lg font-bold text-cyan-400">{selectedTrack.bpm || 'N/A'}</div>
                    </div>
                    <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                      <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Harmonic</div>
                      <div className="text-lg font-bold text-pink-400">{selectedTrack.key || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* AI Reasoning */}
                {selectedTrack.aiReasoning && (
                  <div className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/5 blur-3xl" />
                    <div className="flex items-center gap-2 text-[10px] font-bold text-cyan-400 uppercase mb-3">
                      <Sparkles className="w-3 h-3" />
                      Why AI Chose This
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed italic">
                      {selectedTrack.aiReasoning}
                    </p>
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                      <div className="flex justify-between items-center text-[9px] font-bold">
                        <span className="text-gray-500 uppercase">Energy Compatibility</span>
                        <span className="text-cyan-400">High (0.92)</span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 w-[92%] shadow-[0_0_8px_rgba(0,242,255,0.6)]" />
                      </div>
                    </div>
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
      <footer className="h-20 bg-[#0a0c1c]/80 backdrop-blur-xl border-t border-white/5 flex items-center px-6 gap-8 z-50">
        {/* Player Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={skipPrevious}
            disabled={playingNodeIndex === null || playingNodeIndex <= 0}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <SkipBack className="w-5 h-5" />
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
            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </button>
          <button
            onClick={skipNext}
            disabled={playingNodeIndex === null || playingNodeIndex >= playlist.length - 1}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Scrubber */}
        <div className="flex-1 space-y-2">
          <div className="flex justify-between text-[10px] font-mono text-gray-500">
            <span className="text-cyan-400 font-bold uppercase tracking-wider">
              {isPlaying || playingNodeIndex !== null
                ? `Playing: ${playlist[activeTrackIndex]?.track.title || 'Unknown'}`
                : 'Ready to play'}
            </span>
            <span>00:00 / {formatDuration(totalDuration)}</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden relative cursor-pointer group">
            <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors" />
            <div className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-cyan-500 to-pink-500 w-0 shadow-[0_0_10px_rgba(0,242,255,0.5)]" />
          </div>
        </div>

        {/* Mini Player */}
        <div className="flex items-center gap-4 w-72 border-l border-white/10 pl-8">
          <div className="w-14 h-9 bg-black/40 border border-white/5 rounded flex items-center justify-center overflow-hidden relative group">
            <img
              src={playlist[activeTrackIndex]?.track.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop'}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-left overflow-hidden">
            <div className="text-[10px] font-bold text-white truncate uppercase tracking-tighter">
              {playlist[activeTrackIndex]?.track.title || 'Project Workspace'}
            </div>
            <div className="text-[9px] text-gray-500 uppercase tracking-widest flex items-center gap-1">
              YouTube Source
            </div>
          </div>
        </div>
      </footer>

      {/* Export Flow */}
      <ExportFlow isOpen={showExport} onClose={() => setShowExport(false)} />
    </div>
  )
}
