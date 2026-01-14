'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  Music,
  Zap,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Mic,
  Volume2,
  Hash,
  Timer
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { useState } from 'react'
import type { EnergyPreset, ContentMode, LengthTarget } from '@/types'

const LENGTH_PRESETS: { label: string; value: LengthTarget }[] = [
  { label: '15 songs', value: { type: 'tracks', count: 15 } },
  { label: '30 songs', value: { type: 'tracks', count: 30 } },
  { label: '60 songs', value: { type: 'tracks', count: 60 } },
  { label: '~45 min', value: { type: 'runtime', minutes: 45 } },
  { label: '~2 hours', value: { type: 'runtime', minutes: 120 } }
]

const ENERGY_PRESETS: { id: EnergyPreset; label: string; description: string }[] = [
  { id: 'no-slow-songs', label: 'No slow songs', description: 'Keep energy above 50' },
  { id: 'keep-it-mellow', label: 'Keep it mellow', description: 'Soft, gentle energy throughout' },
  { id: 'mid-tempo-groove', label: 'Mid-tempo groove', description: 'Steady 60-75 energy range' },
  { id: 'bpm-ramp', label: 'BPM ramp', description: 'Gradual tempo increase throughout' },
  { id: 'custom', label: 'Custom', description: 'Use arc template settings' }
]

const CONTENT_MODES: { id: ContentMode; label: string; icon: React.ReactNode; description: string }[] = [
  { id: 'clean', label: 'Clean', icon: <ShieldCheck className="w-3.5 h-3.5" />, description: 'No explicit content' },
  { id: 'explicit-ok', label: 'Explicit OK', icon: <Music className="w-3.5 h-3.5" />, description: 'Allow explicit tracks' },
  { id: 'family', label: 'Family', icon: <ShieldCheck className="w-3.5 h-3.5" />, description: 'Family-friendly only' }
]

interface GenerationControlsProps {
  className?: string
}

export function GenerationControls({ className }: GenerationControlsProps) {
  const { generationControls, setGenerationControls, setVocalDensity } = useYTDJStore()

  const [expandedSections, setExpandedSections] = useState({
    length: true,
    energy: false,
    content: false,
    vocal: false
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const isLengthSelected = (preset: LengthTarget) => {
    const current = generationControls.lengthTarget
    if (current.type !== preset.type) return false
    if (current.type === 'tracks' && preset.type === 'tracks') {
      return current.count === preset.count
    }
    if (current.type === 'runtime' && preset.type === 'runtime') {
      return current.minutes === preset.minutes
    }
    return false
  }

  const getVocalLabel = (value: number, low: string, high: string) => {
    if (value < 33) return low
    if (value > 66) return high
    return 'Balanced'
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Length & Runtime Target */}
      <div className="bg-[#0a0c1c]/80 backdrop-blur-xl rounded-xl border border-white/10">
        <button
          onClick={() => toggleSection('length')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
              {generationControls.lengthTarget.type === 'tracks' ? (
                <Hash className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <Timer className="w-3.5 h-3.5 text-blue-400" />
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold tracking-wider text-white">
                SET LENGTH
              </h3>
              <p className="text-[10px] text-white/40">
                {generationControls.lengthTarget.type === 'tracks'
                  ? `${generationControls.lengthTarget.count} songs`
                  : `~${generationControls.lengthTarget.minutes} minutes`}
              </p>
            </div>
          </div>
          {expandedSections.length ? (
            <ChevronUp className="w-4 h-4 text-white/40" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/40" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.length && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4">
                <div className="flex flex-wrap gap-2">
                  {LENGTH_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setGenerationControls({ lengthTarget: preset.value })}
                      className={cn(
                        'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border',
                        isLengthSelected(preset.value)
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-white/30 mt-3">
                  Runtime targets optimize for total duration, not just track count
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Energy & Tempo Constraints */}
      <div className="bg-[#0a0c1c]/80 backdrop-blur-xl rounded-xl border border-white/10">
        <button
          onClick={() => toggleSection('energy')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold tracking-wider text-white">
                ENERGY PRESET
              </h3>
              <p className="text-[10px] text-white/40">
                {ENERGY_PRESETS.find(p => p.id === generationControls.energyPreset)?.label || 'Custom'}
              </p>
            </div>
          </div>
          {expandedSections.energy ? (
            <ChevronUp className="w-4 h-4 text-white/40" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/40" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.energy && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-2">
                {ENERGY_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setGenerationControls({ energyPreset: preset.id })}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all border',
                      generationControls.energyPreset === preset.id
                        ? 'bg-orange-500/20 border-orange-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    )}
                  >
                    <span className={cn(
                      'text-xs font-bold',
                      generationControls.energyPreset === preset.id ? 'text-orange-400' : 'text-white'
                    )}>
                      {preset.label}
                    </span>
                    <span className="text-[10px] text-white/40">
                      {preset.description}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Clean / Explicit / Family Mode */}
      <div className="bg-[#0a0c1c]/80 backdrop-blur-xl rounded-xl border border-white/10">
        <button
          onClick={() => toggleSection('content')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold tracking-wider text-white">
                CONTENT MODE
              </h3>
              <p className="text-[10px] text-white/40">
                {CONTENT_MODES.find(m => m.id === generationControls.contentMode)?.label || 'Explicit OK'}
              </p>
            </div>
          </div>
          {expandedSections.content ? (
            <ChevronUp className="w-4 h-4 text-white/40" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/40" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.content && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4">
                <div className="grid grid-cols-3 gap-2">
                  {CONTENT_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setGenerationControls({ contentMode: mode.id })}
                      className={cn(
                        'flex flex-col items-center gap-1.5 px-3 py-3 rounded-lg transition-all border',
                        generationControls.contentMode === mode.id
                          ? 'bg-green-500/20 border-green-500/50'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      )}
                    >
                      <span className={cn(
                        generationControls.contentMode === mode.id ? 'text-green-400' : 'text-white/60'
                      )}>
                        {mode.icon}
                      </span>
                      <span className={cn(
                        'text-xs font-bold',
                        generationControls.contentMode === mode.id ? 'text-green-400' : 'text-white'
                      )}>
                        {mode.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Vocal Density */}
      <div className="bg-[#0a0c1c]/80 backdrop-blur-xl rounded-xl border border-white/10">
        <button
          onClick={() => toggleSection('vocal')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-pink-500/20 flex items-center justify-center">
              <Mic className="w-3.5 h-3.5 text-pink-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold tracking-wider text-white">
                VOCAL DENSITY
              </h3>
              <p className="text-[10px] text-white/40">Instrument vs vocal balance</p>
            </div>
          </div>
          {expandedSections.vocal ? (
            <ChevronUp className="w-4 h-4 text-white/40" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/40" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.vocal && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-5">
                {/* Instrumental vs Vocal */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                      Instrumental ↔ Vocal
                    </label>
                    <span className="text-xs font-medium text-pink-400">
                      {getVocalLabel(generationControls.vocalDensity.instrumentalVsVocal, 'Instrumental', 'Vocal-heavy')}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={generationControls.vocalDensity.instrumentalVsVocal}
                    onChange={(e) => setVocalDensity('instrumentalVsVocal', parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-pink-500"
                  />
                  <div className="flex justify-between text-[9px] text-white/30">
                    <span>Pure instrumental</span>
                    <span>All vocals</span>
                  </div>
                </div>

                {/* Hooky vs Atmospheric */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                      Hooky ↔ Atmospheric
                    </label>
                    <span className="text-xs font-medium text-pink-400">
                      {getVocalLabel(generationControls.vocalDensity.hookyVsAtmospheric, 'Hooky', 'Atmospheric')}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={generationControls.vocalDensity.hookyVsAtmospheric}
                    onChange={(e) => setVocalDensity('hookyVsAtmospheric', parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-pink-500"
                  />
                  <div className="flex justify-between text-[9px] text-white/30">
                    <span>Catchy hooks</span>
                    <span>Ambient textures</span>
                  </div>
                </div>

                {/* Lyric Clarity */}
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                      Lyric Clarity ↔ Abstract
                    </label>
                    <span className="text-xs font-medium text-pink-400">
                      {getVocalLabel(generationControls.vocalDensity.lyricClarity, 'Clear lyrics', 'Abstract')}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={generationControls.vocalDensity.lyricClarity}
                    onChange={(e) => setVocalDensity('lyricClarity', parseInt(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-pink-500"
                  />
                  <div className="flex justify-between text-[9px] text-white/30">
                    <span>Clear, story-driven</span>
                    <span>Abstract/buried</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
