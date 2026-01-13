'use client'

import { useState, useEffect } from 'react'
import {
  Zap, RefreshCw, Plus, Shuffle, Loader2, Waves
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'

const ARC_TEMPLATES = [
  { id: 'warmup', name: 'Warm-up Peak', svg: 'M0,25 Q50,5 100,25' },
  { id: 'burn', name: 'Slow Burn', svg: 'M0,28 L100,5' },
  { id: 'valley', name: 'The Valley', svg: 'M0,5 Q50,28 100,5' },
  { id: 'chaos', name: 'Pulse Chaos', svg: 'M0,15 L20,5 L40,25 L60,10 L80,28 L100,15' }
]

interface AIControlsSidebarProps {
  onRegenerate: (mode?: 'replace' | 'append') => void
  onAutoSmooth?: () => void
  onRandomizeUnlocked?: () => void
  isGenerating: boolean
  isSmoothing?: boolean
  bpmTolerance: number
  onBpmToleranceChange: (value: number) => void
  targetTrackCount: number
  onTargetTrackCountChange: (value: number) => void
}

export function AIControlsSidebar({
  onRegenerate,
  onAutoSmooth,
  onRandomizeUnlocked,
  isGenerating,
  isSmoothing = false,
  bpmTolerance,
  onBpmToleranceChange,
  targetTrackCount,
  onTargetTrackCountChange
}: AIControlsSidebarProps) {
  const {
    currentSet,
    updatePrompt,
    ui,
    activeArcTemplate,
    setActiveArcTemplate
  } = useYTDJStore()

  const playlist = currentSet?.playlist || []
  const [editingPrompt, setEditingPrompt] = useState(currentSet?.prompt || '')
  const [isPromptEditing, setIsPromptEditing] = useState(false)
  const [pendingArcChange, setPendingArcChange] = useState<string | null>(null)

  // Sync prompt when currentSet changes
  useEffect(() => {
    setEditingPrompt(currentSet?.prompt || '')
  }, [currentSet?.prompt])

  const totalDuration = playlist.reduce((acc, node) => acc + node.track.duration, 0)
  const lockedCount = playlist.filter(n => n.isLocked).length

  const handleArcChange = (arcId: string) => {
    if (isGenerating) return
    setPendingArcChange(arcId)
    setActiveArcTemplate(arcId)
    // Clear pending after a short delay
    setTimeout(() => setPendingArcChange(null), 1000)
  }

  const handleRegenerateClick = () => {
    if (isPromptEditing) {
      // Save prompt and regenerate
      updatePrompt(editingPrompt)
      setIsPromptEditing(false)
    }
    onRegenerate()
  }

  if (ui.leftSidebarPanel === 'constraints' || ui.leftSidebarPanel === 'sets') {
    return null
  }

  return (
    <aside className="w-80 bg-[#0a0c1c]/80 backdrop-blur-xl border-r border-white/5 flex flex-col overflow-hidden transition-all">
      <div className="p-6 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
        {/* Prompt Display/Edit */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> Current Prompt
            </label>
            {!isPromptEditing && (
              <button
                onClick={() => setIsPromptEditing(true)}
                className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider"
              >
                Edit
              </button>
            )}
          </div>
          {isPromptEditing ? (
            <div className="space-y-3">
              <textarea
                value={editingPrompt}
                onChange={(e) => setEditingPrompt(e.target.value)}
                placeholder="Describe your ideal DJ set..."
                className="w-full h-32 p-4 bg-black/50 border border-cyan-500/30 rounded-xl text-sm text-white resize-none focus:outline-none focus:border-cyan-500/60 placeholder-gray-600"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsPromptEditing(false)
                    setEditingPrompt(currentSet?.prompt || '')
                  }}
                  className="flex-1 py-2 text-[10px] font-bold text-gray-400 hover:text-white uppercase tracking-wider border border-white/10 rounded-lg hover:border-white/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegenerateClick}
                  disabled={isGenerating || !editingPrompt.trim()}
                  className="flex-1 py-2 text-[10px] font-bold text-black uppercase tracking-wider bg-cyan-500 rounded-lg hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3" />
                      Regenerate
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div
              className="p-4 bg-black/50 border border-white/5 rounded-xl text-sm text-gray-300 italic cursor-pointer hover:border-white/10 transition-all"
              onClick={() => setIsPromptEditing(true)}
            >
              {currentSet?.prompt || 'Click to add a prompt...'}
            </div>
          )}
        </div>

        {/* Arc Template Selector */}
        <div className="space-y-4">
          <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Tempo Arc Template</label>
          <div className="grid grid-cols-2 gap-2">
            {ARC_TEMPLATES.map((arc) => (
              <button
                key={arc.id}
                onClick={() => handleArcChange(arc.id)}
                disabled={isGenerating}
                className={cn(
                  'p-3 border rounded-xl transition-all text-left disabled:opacity-50',
                  activeArcTemplate === arc.id
                    ? 'border-cyan-500/50 bg-cyan-500/5'
                    : 'border-white/5 hover:border-white/10'
                )}
              >
                <span className={cn(
                  'text-[9px] font-bold uppercase block mb-2',
                  activeArcTemplate === arc.id ? 'text-cyan-400' : 'text-gray-500'
                )}>
                  {arc.name}
                </span>
                <svg className="w-full h-8" viewBox="0 0 100 30">
                  <path
                    d={arc.svg}
                    fill="none"
                    stroke={activeArcTemplate === arc.id ? '#00f2ff' : '#444'}
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
            onChange={(e) => onBpmToleranceChange(parseInt(e.target.value))}
            className="w-full accent-cyan-500"
          />
        </div>

        {/* Track Count & Duration Controls */}
        <div className="space-y-4">
          <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Set Configuration</label>

          {/* Track Count Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-gray-400">Track Count</span>
              <span className="text-sm font-mono text-cyan-400">{targetTrackCount} tracks</span>
            </div>
            <input
              type="range"
              min="4"
              max="20"
              value={targetTrackCount}
              onChange={(e) => onTargetTrackCountChange(parseInt(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <div className="flex justify-between text-[9px] font-bold text-gray-600 uppercase">
              <span>4</span>
              <span>20</span>
            </div>
          </div>

          {/* Current Stats */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Current Tracks</span>
              <span className="text-lg font-black text-white">{playlist.length}</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Duration</span>
              <span className="text-sm font-bold text-cyan-400">{Math.floor(totalDuration / 60)} min</span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Locked</span>
              <span className="text-sm font-bold text-pink-400">{lockedCount}</span>
            </div>
          </div>

          {/* Global Actions Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Replace All */}
            <button
              onClick={() => onRegenerate('replace')}
              disabled={isGenerating || !editingPrompt.trim()}
              className="py-3 px-2 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Replace All
            </button>

            {/* Add More */}
            <button
              onClick={() => onRegenerate('append')}
              disabled={isGenerating || !editingPrompt.trim() || playlist.length >= 20}
              className="py-3 px-2 bg-pink-500/20 border border-pink-500/30 text-pink-400 font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-pink-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add More
            </button>

            {/* Auto-Smooth Transitions */}
            {onAutoSmooth && (
              <button
                onClick={onAutoSmooth}
                disabled={isSmoothing || playlist.length < 2}
                className="py-3 px-2 bg-purple-500/20 border border-purple-500/30 text-purple-400 font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isSmoothing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="hidden xl:inline">Smoothing</span>
                  </>
                ) : (
                  <>
                    <Waves className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline">Smooth</span>
                  </>
                )}
              </button>
            )}

            {/* Randomize Unlocked */}
            {onRandomizeUnlocked && (
              <button
                onClick={onRandomizeUnlocked}
                disabled={playlist.filter(n => !n.isLocked).length < 2}
                className="py-3 px-2 bg-orange-500/20 border border-orange-500/30 text-orange-400 font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Randomize</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Regenerate Footer */}
      <div className="p-6 border-t border-white/5 bg-black/20">
        <button
          onClick={handleRegenerateClick}
          disabled={isGenerating || !editingPrompt.trim()}
          className="w-full py-4 bg-cyan-500 text-black font-black text-xs uppercase tracking-widest rounded-lg hover:bg-cyan-400 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Regenerate Set
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
