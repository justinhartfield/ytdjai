'use client'

import { motion } from 'framer-motion'
import {
  Hash,
  Timer,
  Zap,
  Check,
  TrendingUp,
  Minus,
  Activity,
  Gauge
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { WizardStep } from '../WizardStep'
import type { EnergyPreset, LengthTarget } from '@/types'

const LENGTH_PRESETS: { label: string; value: LengthTarget; icon: React.ReactNode }[] = [
  { label: '15 songs', value: { type: 'tracks', count: 15 }, icon: <Hash className="w-4 h-4" /> },
  { label: '30 songs', value: { type: 'tracks', count: 30 }, icon: <Hash className="w-4 h-4" /> },
  { label: '60 songs', value: { type: 'tracks', count: 60 }, icon: <Hash className="w-4 h-4" /> },
  { label: '~45 min', value: { type: 'runtime', minutes: 45 }, icon: <Timer className="w-4 h-4" /> },
  { label: '~2 hours', value: { type: 'runtime', minutes: 120 }, icon: <Timer className="w-4 h-4" /> }
]

const ENERGY_PRESETS: { id: EnergyPreset; label: string; description: string; icon: React.ReactNode }[] = [
  { id: 'no-slow-songs', label: 'No slow songs', description: 'Keep energy above 50', icon: <Zap className="w-4 h-4" /> },
  { id: 'keep-it-mellow', label: 'Keep it mellow', description: 'Soft, gentle energy', icon: <Minus className="w-4 h-4" /> },
  { id: 'mid-tempo-groove', label: 'Mid-tempo groove', description: '60-75 energy range', icon: <Activity className="w-4 h-4" /> },
  { id: 'bpm-ramp', label: 'BPM ramp', description: 'Gradual tempo increase', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'custom', label: 'Custom', description: 'Use arc settings', icon: <Gauge className="w-4 h-4" /> }
]

export function ShapeLengthStep() {
  const { generationControls, setGenerationControls } = useYTDJStore()

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

  return (
    <WizardStep
      title="How long and what energy curve?"
      subtitle="Set playlist length and energy profile"
    >
      {/* Length Selection */}
      <div className="space-y-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
        <div className="flex items-center gap-2">
          {generationControls.lengthTarget.type === 'tracks' ? (
            <Hash className="w-4 h-4 text-blue-400" />
          ) : (
            <Timer className="w-4 h-4 text-blue-400" />
          )}
          <h3 className="text-sm font-bold text-blue-400">SET LENGTH</h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {LENGTH_PRESETS.map((preset) => {
            const isSelected = isLengthSelected(preset.value)
            return (
              <motion.button
                key={preset.label}
                onClick={() => setGenerationControls({ lengthTarget: preset.value })}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all border',
                  isSelected
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                )}
              >
                {preset.icon}
                {preset.label}
                {isSelected && <Check className="w-4 h-4" />}
              </motion.button>
            )
          })}
        </div>

        <p className="text-xs text-white/30">
          Runtime targets optimize for total duration, not just track count
        </p>
      </div>

      {/* Energy Preset Selection */}
      <div className="space-y-4 p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-bold text-orange-400">ENERGY PROFILE</h3>
        </div>

        <div className="space-y-2">
          {ENERGY_PRESETS.map((preset) => {
            const isSelected = generationControls.energyPreset === preset.id
            return (
              <motion.button
                key={preset.id}
                onClick={() => setGenerationControls({ energyPreset: preset.id })}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={cn(
                  'w-full flex items-center gap-4 px-4 py-3 rounded-lg text-left transition-all border',
                  isSelected
                    ? 'bg-orange-500/20 border-orange-500/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                )}
              >
                <span className={cn(
                  isSelected ? 'text-orange-400' : 'text-white/40'
                )}>
                  {preset.icon}
                </span>
                <div className="flex-1">
                  <span className={cn(
                    'text-sm font-bold',
                    isSelected ? 'text-orange-400' : 'text-white'
                  )}>
                    {preset.label}
                  </span>
                  <span className="text-xs text-white/40 ml-2">
                    {preset.description}
                  </span>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-black" />
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>
    </WizardStep>
  )
}
