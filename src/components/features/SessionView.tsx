'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Undo2, Redo2, Download, Play, Pause, SkipBack, SkipForward,
  Lock, X, RefreshCw, Plus, Sparkles, Info
} from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import type { PlaylistNode, Track } from '@/types'

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
  const { currentSet, updatePlaylist } = useYTDJStore()
  const playlist = currentSet?.playlist || []

  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [auditioningTrack, setAuditioningTrack] = useState<Track | null>(null)
  const [autoPreview, setAutoPreview] = useState(true)
  const [matchHarmonics, setMatchHarmonics] = useState(true)
  const [showExport, setShowExport] = useState(false)

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
    if (autoPreview) {
      setIsPlaying(true)
    }
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

  return (
    <div className="h-full flex flex-col bg-[#05060f] overflow-hidden">
      {/* Scanline Effect */}
      <div className="fixed inset-0 pointer-events-none z-50">
        <div className="absolute w-full h-24 bg-gradient-to-b from-transparent via-cyan-500/[0.02] to-transparent animate-scanline" />
      </div>

      {/* Header */}
      <header className="h-14 bg-[#0a0c1c]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-cyan-400 to-pink-500 rounded-sm" />
            <span className="font-bold tracking-tighter text-lg">YTDJ.AI</span>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-300">{currentSet?.name || 'Untitled Set'}</span>
            <span className="text-[10px] uppercase tracking-widest text-cyan-500 font-bold bg-cyan-500/10 px-2 py-0.5 rounded animate-pulse">
              Live Link
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <nav className="flex items-center bg-black/40 rounded-lg p-1 border border-white/5">
            <button
              onClick={() => onViewChange('arrangement')}
              className={cn(
                'px-3 py-1 rounded text-xs font-bold transition-all',
                currentView === 'arrangement' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
              )}
            >
              ARRANGEMENT
            </button>
            <button
              onClick={() => onViewChange('session')}
              className={cn(
                'px-3 py-1 rounded text-xs font-bold transition-all',
                currentView === 'session' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
              )}
            >
              SESSION
            </button>
          </nav>

          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-white/5 rounded text-gray-400"><Undo2 className="w-4 h-4" /></button>
            <button className="p-2 hover:bg-white/5 rounded text-gray-400"><Redo2 className="w-4 h-4" /></button>
          </div>

          <button
            onClick={() => setShowExport(true)}
            className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold rounded-md transition-all shadow-[0_0_15px_rgba(0,242,255,0.2)] hover:shadow-[0_0_25px_rgba(0,242,255,0.4)]"
          >
            EXPORT SET
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: AI Controls */}
        <aside className="w-72 bg-[#0a0c1c]/80 backdrop-blur-xl border-r border-white/5 flex flex-col z-40">
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Set Constraints</h2>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8">
            {/* Prompt Card */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Atmosphere</label>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-sm italic text-gray-300">
                {currentSet?.prompt || 'AI-generated set based on your preferences'}
              </div>
            </div>

            {/* Current Arc */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Current Arc</label>
              <div className="p-3 border border-cyan-500/30 bg-cyan-500/5 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold">WARM-UP PEAK</span>
                  <span className="text-[9px] text-cyan-400">
                    {playlist[0]?.track.bpm || 80} → {playlist[playlist.length - 1]?.track.bpm || 145} BPM
                  </span>
                </div>
                <svg className="w-full h-8" viewBox="0 0 100 20">
                  <path d="M0,15 Q30,15 50,5 T100,2" fill="none" stroke="#00f2ff" strokeWidth="2" />
                </svg>
              </div>
            </div>

            {/* Session Toggles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Auto-Preview</span>
                <button
                  onClick={() => setAutoPreview(!autoPreview)}
                  className={cn(
                    'w-8 h-4 rounded-full relative transition-colors',
                    autoPreview ? 'bg-cyan-500' : 'bg-white/10'
                  )}
                >
                  <div className={cn(
                    'absolute w-4 h-4 bg-white rounded-full transition-transform shadow-md',
                    autoPreview ? 'translate-x-4' : 'translate-x-0'
                  )} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Match Harmonics</span>
                <button
                  onClick={() => setMatchHarmonics(!matchHarmonics)}
                  className={cn(
                    'w-8 h-4 rounded-full relative transition-colors',
                    matchHarmonics ? 'bg-pink-500' : 'bg-white/10'
                  )}
                >
                  <div className={cn(
                    'absolute w-4 h-4 bg-white rounded-full transition-transform shadow-md',
                    matchHarmonics ? 'translate-x-4' : 'translate-x-0'
                  )} />
                </button>
              </div>
            </div>

            {/* Track Stats */}
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

          <div className="p-4 border-t border-white/5 bg-black/40">
            <div className="flex items-center gap-3 text-gray-500 text-[10px] font-bold uppercase">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              AI Engine Active
            </div>
          </div>
        </aside>

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
                        selectedTrack?.id === col.activeTrack.track.id && 'border-cyan-400'
                      )}>
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-900 mb-2">
                          <img
                            src={col.activeTrack.track.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop'}
                            alt={col.activeTrack.track.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-8 h-8 fill-white text-white" />
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
                        <button className="w-4 h-4 bg-white/5 rounded flex items-center justify-center hover:text-cyan-400 transition-colors">
                          <Lock className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      <div className="text-[9px] font-bold text-gray-600 uppercase">Match: 98%</div>
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

                    <button className="w-full py-4 rounded-lg border-2 border-dashed border-white/5 hover:border-white/10 flex items-center justify-center group transition-all">
                      <Plus className="w-5 h-5 text-gray-600 group-hover:text-gray-400" />
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

          {/* Global Action Bar */}
          <div className="h-12 border-t border-white/5 bg-black/40 flex items-center px-6 gap-6 z-20">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Global Ops</span>
            <div className="h-4 w-px bg-white/10" />
            <button className="text-[9px] font-bold text-cyan-400 hover:bg-cyan-400/10 px-3 py-1 rounded-full border border-cyan-400/20 transition-all uppercase">
              Regenerate Grid
            </button>
            <button className="text-[9px] font-bold text-pink-400 hover:bg-pink-400/10 px-3 py-1 rounded-full border border-pink-400/20 transition-all uppercase">
              Auto-Smooth Transitions
            </button>
            <button className="text-[9px] font-bold text-white hover:bg-white/10 px-3 py-1 rounded-full border border-white/20 transition-all uppercase">
              Randomize Unlocked
            </button>
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
                    <button className="absolute bottom-4 right-4 w-10 h-10 bg-white text-black rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                      <Play className="w-5 h-5" />
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
                      {selectedTrack.aiReasoning.join(' ')}
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
          <button className="text-gray-400 hover:text-white transition-colors">
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </button>
          <button className="text-gray-400 hover:text-white transition-colors">
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Scrubber */}
        <div className="flex-1 space-y-2">
          <div className="flex justify-between text-[10px] font-mono text-gray-500">
            <span className="text-cyan-400 font-bold uppercase tracking-wider">
              {isPlaying ? `Playing: ${selectedTrack?.title || 'Unknown'}` : 'Paused'}
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
              src={selectedTrack?.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop'}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-left overflow-hidden">
            <div className="text-[10px] font-bold text-white truncate uppercase tracking-tighter">
              {selectedTrack?.title || 'Project Workspace'}
            </div>
            <div className="text-[9px] text-gray-500 uppercase tracking-widest flex items-center gap-1">
              YouTube Source
            </div>
          </div>
        </div>
      </footer>

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
                    defaultValue={currentSet?.name || 'My DJ Set'}
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
