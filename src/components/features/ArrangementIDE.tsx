'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Undo2, Redo2, Download, Play, Pause, SkipBack, SkipForward,
  Lock, Unlock, Trash2, X, RefreshCw, Settings2, Sparkles
} from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import type { PlaylistNode, Track } from '@/types'

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
  const { currentSet, updatePlaylist } = useYTDJStore()
  const playlist = currentSet?.playlist || []

  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number | null>(0)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragStartX, setDragStartX] = useState<number>(0)
  const [dragCurrentX, setDragCurrentX] = useState<number>(0)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const [isDraggingHorizontal, setIsDraggingHorizontal] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeTrackIndex, setActiveTrackIndex] = useState(0)
  const [activeTemplate, setActiveTemplate] = useState('warmup')
  const [bpmTolerance, setBpmTolerance] = useState(5)
  const [showExport, setShowExport] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)

  // Calculate node positions based on BPM
  const nodePositions = useMemo(() => {
    return playlist.map((node, index) => {
      const x = ((index + 1) / (playlist.length + 1)) * 100
      const bpm = node.track.bpm || 120
      // Map BPM (60-200) to Y position (canvas height percentage)
      const y = 100 - ((bpm - 60) / 140) * 100
      return { x, y: Math.max(10, Math.min(90, y)) }
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
    setDraggedIndex(index)
    setSelectedNodeIndex(index)
    setDragStartX(e.clientX)
    setDragCurrentX(e.clientX)
    setIsDraggingHorizontal(false)
  }, [])

  const handleNodeDrag = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current || draggedIndex === null) return

    const rect = canvasRef.current.getBoundingClientRect()
    const deltaX = Math.abs(e.clientX - dragStartX)
    const deltaY = Math.abs(e.clientY - (rect.top + rect.height / 2))

    // Determine drag direction - horizontal for reorder, vertical for BPM
    if (!isDraggingHorizontal && deltaX > 20) {
      setIsDraggingHorizontal(true)
    }

    if (isDraggingHorizontal) {
      // Horizontal drag - reordering
      setDragCurrentX(e.clientX)

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
    } else {
      // Vertical drag - BPM adjustment
      const y = ((e.clientY - rect.top) / rect.height) * 100
      const clampedY = Math.max(10, Math.min(90, y))

      // Convert Y to BPM
      const newBpm = Math.round(200 - (clampedY / 100) * 140)

      // Update the track's target BPM
      const newPlaylist = [...playlist]
      newPlaylist[draggedIndex] = {
        ...newPlaylist[draggedIndex],
        targetBpm: newBpm
      }
      updatePlaylist(newPlaylist)
    }
  }, [draggedIndex, dragStartX, isDraggingHorizontal, playlist, updatePlaylist])

  const handleNodeDragEnd = useCallback(() => {
    if (draggedIndex !== null && dropTargetIndex !== null && isDraggingHorizontal) {
      // Reorder the playlist
      const newPlaylist = [...playlist]
      const [removed] = newPlaylist.splice(draggedIndex, 1)
      const insertIndex = dropTargetIndex > draggedIndex ? dropTargetIndex - 1 : dropTargetIndex
      newPlaylist.splice(insertIndex, 0, removed)
      updatePlaylist(newPlaylist)
      setSelectedNodeIndex(insertIndex)
    }

    setDraggedIndex(null)
    setDropTargetIndex(null)
    setIsDraggingHorizontal(false)
  }, [draggedIndex, dropTargetIndex, isDraggingHorizontal, playlist, updatePlaylist])

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
            <button className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"><Undo2 className="w-5 h-5" /></button>
            <button className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"><Redo2 className="w-5 h-5" /></button>
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
        {/* Left Sidebar: AI Controls */}
        <aside className="w-80 bg-[#0a0c1c]/80 backdrop-blur-xl border-r border-white/5 flex flex-col overflow-hidden">
          <div className="p-6 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
            {/* Prompt Display */}
            <div className="space-y-4">
              <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> Current Prompt
              </label>
              <div className="p-4 bg-black/50 border border-white/5 rounded-xl text-sm text-gray-300 italic">
                {currentSet?.prompt || 'AI-generated set based on your preferences'}
              </div>
            </div>

            {/* Arc Template Selector */}
            <div className="space-y-4">
              <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Tempo Arc Template</label>
              <div className="grid grid-cols-2 gap-2">
                {ARC_TEMPLATES.map((arc) => (
                  <button
                    key={arc.id}
                    onClick={() => setActiveTemplate(arc.id)}
                    className={cn(
                      'p-3 border rounded-xl transition-all text-left',
                      activeTemplate === arc.id
                        ? 'border-cyan-500/50 bg-cyan-500/5'
                        : 'border-white/5 hover:border-white/10'
                    )}
                  >
                    <span className={cn(
                      'text-[9px] font-bold uppercase block mb-2',
                      activeTemplate === arc.id ? 'text-cyan-400' : 'text-gray-500'
                    )}>
                      {arc.name}
                    </span>
                    <svg className="w-full h-8" viewBox="0 0 100 30">
                      <path
                        d={arc.svg}
                        fill="none"
                        stroke={activeTemplate === arc.id ? '#00f2ff' : '#444'}
                        strokeWidth="2"
                      />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* BPM Tolerance */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">BPM Tolerance</label>
                <span className="text-xs font-mono text-cyan-400">±{bpmTolerance} BPM</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={bpmTolerance}
                onChange={(e) => setBpmTolerance(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Track Count */}
            <div className="p-4 bg-white/5 rounded-xl border border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Total Tracks</span>
                <span className="text-lg font-black text-white">{playlist.length}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Duration</span>
                <span className="text-sm font-bold text-cyan-400">{Math.floor(totalDuration / 60)} min</span>
              </div>
            </div>
          </div>

          {/* Regenerate Footer */}
          <div className="p-6 border-t border-white/5 bg-black/20">
            <button className="w-full py-4 bg-cyan-500 text-black font-black text-xs uppercase tracking-widest rounded-lg hover:bg-cyan-400 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" />
              Regenerate Set
            </button>
          </div>
        </aside>

        {/* Center Canvas */}
        <main
          ref={canvasRef}
          className="flex-1 relative flex flex-col bg-[#070815] overflow-hidden select-none"
          onMouseMove={handleNodeDrag}
          onMouseUp={handleNodeDragEnd}
          onMouseLeave={handleNodeDragEnd}
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
                  strokeWidth="0.5"
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

              return (
                <motion.div
                  key={node.id}
                  className={cn(
                    "absolute z-40",
                    isBeingReordered && "z-50"
                  )}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  animate={{
                    scale: isDragging ? 1.15 : 1,
                    opacity: isBeingReordered ? 0.5 : 1
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
                    {/* Drag BPM HUD - only show when dragging vertically */}
                    <AnimatePresence>
                      {isDragging && !isDraggingHorizontal && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute -top-16 left-1/2 -translate-x-1/2 bg-cyan-500 text-black px-3 py-1 rounded font-black text-lg shadow-2xl z-50"
                        >
                          {node.targetBpm || node.track.bpm || 120}<span className="text-[10px] ml-1">BPM</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

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

                    {/* Node Circle */}
                    <div className={cn(
                      'w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all bg-[#05060f]',
                      selectedNodeIndex === index ? 'border-cyan-400 shadow-[0_0_15px_rgba(0,242,255,0.4)]' : 'border-white/20 group-hover:border-white/40',
                      isPlaying && activeTrackIndex === index && 'animate-pulse',
                      isBeingReordered && 'border-pink-500 shadow-[0_0_20px_rgba(255,0,229,0.5)]'
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
          </div>

          {/* Transport Bar */}
          <footer className="h-24 bg-[#0a0c1c]/80 backdrop-blur-xl border-t border-white/5 flex items-center px-8 gap-12">
            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />

            {/* Playback Controls */}
            <div className="flex items-center gap-6">
              <button className="text-gray-500 hover:text-white transition-colors">
                <SkipBack className="w-6 h-6" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl"
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
              </button>
              <button className="text-gray-500 hover:text-white transition-colors">
                <SkipForward className="w-6 h-6" />
              </button>
            </div>

            {/* Progress Section */}
            <div className="flex-1 space-y-3">
              <div className="flex justify-between items-center text-[10px] font-mono tracking-widest text-gray-500">
                <div className="flex items-center gap-4">
                  <span className="text-cyan-400 font-black">
                    PLAYING: {playlist[activeTrackIndex]?.track.title || 'No track'}
                  </span>
                  <span>•</span>
                  <span>{playlist[activeTrackIndex]?.track.bpm || 120} BPM</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white">00:00</span> / <span>{formatDuration(totalDuration)}</span>
                </div>
              </div>
              <div className="h-1 bg-white/5 rounded-full relative overflow-hidden group cursor-pointer">
                <div className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-cyan-400 to-pink-500 w-[0%] shadow-[0_0_15px_rgba(0,242,255,0.5)]" />
              </div>
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
                    <button className="absolute bottom-4 right-4 w-10 h-10 bg-white text-black rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                      <Play className="w-5 h-5" />
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

                {/* AI Reasoning */}
                {selectedNode.track.aiReasoning && (
                  <div className="bg-cyan-500/5 rounded-2xl p-5 border border-cyan-500/10 space-y-3">
                    <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles className="w-3 h-3" />
                      AI Selection Logic
                    </h4>
                    <p className="text-xs text-gray-300 leading-relaxed italic">
                      {selectedNode.track.aiReasoning.join(' ')}
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

      {/* Export Modal */}
      <AnimatePresence>
        {showExport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowExport(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-[#0a0c1c] border border-white/10 max-w-lg w-full p-10 rounded-3xl overflow-hidden"
            >
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/10 blur-[100px]" />

              <h2 className="text-4xl font-black tracking-tighter mb-4 uppercase">Finalize Set</h2>
              <p className="text-gray-400 text-sm mb-8">
                Ready to export your {playlist.length} track set to YouTube Music?
              </p>

              <div className="space-y-6">
                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Playlist Name</div>
                    <div className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[8px] font-bold rounded">READY</div>
                  </div>
                  <input
                    type="text"
                    value={currentSet?.name || 'My DJ Set'}
                    className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-white font-bold outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setShowExport(false)}
                    className="flex-1 py-4 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-white/5 hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button className="flex-[2] py-4 rounded-xl text-xs font-black uppercase tracking-widest text-black bg-cyan-500 hover:bg-cyan-400 transition-all shadow-2xl">
                    Create YT Playlist
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
