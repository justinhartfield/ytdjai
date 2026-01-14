'use client'

import { motion } from 'framer-motion'
import { Mic, Volume2, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { WizardStep } from '../WizardStep'

const QUICK_PRESETS = [
  { label: 'All Instrumental', values: { instrumentalVsVocal: 0, hookyVsAtmospheric: 70, lyricClarity: 50 } },
  { label: 'Vocal-Heavy', values: { instrumentalVsVocal: 85, hookyVsAtmospheric: 30, lyricClarity: 25 } },
  { label: 'Balanced', values: { instrumentalVsVocal: 50, hookyVsAtmospheric: 50, lyricClarity: 50 } }
]

export function VocalBalanceStep() {
  const { generationControls, setVocalDensity, setGenerationControls } = useYTDJStore()
  const { vocalDensity } = generationControls

  const getLabel = (value: number, low: string, high: string) => {
    if (value < 33) return low
    if (value > 66) return high
    return 'Balanced'
  }

  const applyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setGenerationControls({
      vocalDensity: preset.values
    })
  }

  return (
    <WizardStep
      title="How should vocals factor in?"
      subtitle="Adjust the balance of vocals and instrumentation"
    >
      {/* Quick Presets */}
      <div className="flex gap-2 justify-center">
        {QUICK_PRESETS.map((preset) => {
          const isActive =
            vocalDensity.instrumentalVsVocal === preset.values.instrumentalVsVocal &&
            vocalDensity.hookyVsAtmospheric === preset.values.hookyVsAtmospheric &&
            vocalDensity.lyricClarity === preset.values.lyricClarity

          return (
            <motion.button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border',
                isActive
                  ? 'bg-pink-500/20 border-pink-500/50 text-pink-400'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
              )}
            >
              {preset.label}
            </motion.button>
          )
        })}
      </div>

      {/* Sliders */}
      <div className="space-y-6 p-4 bg-pink-500/5 border border-pink-500/20 rounded-xl">
        {/* Instrumental vs Vocal */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
              <Mic className="w-3.5 h-3.5" />
              Instrumental vs Vocal
            </label>
            <span className="text-sm font-medium text-pink-400">
              {getLabel(vocalDensity.instrumentalVsVocal, 'Instrumental', 'Vocal-heavy')}
            </span>
          </div>
          <div className="relative pt-1">
            <input
              type="range"
              min="0"
              max="100"
              value={vocalDensity.instrumentalVsVocal}
              onChange={(e) => setVocalDensity('instrumentalVsVocal', parseInt(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-pink-400
                [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(244,114,182,0.5)]
                [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-white/30 mt-1">
              <span>Pure instrumental</span>
              <span>All vocals</span>
            </div>
          </div>
        </div>

        {/* Hooky vs Atmospheric */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5" />
              Hooky vs Atmospheric
            </label>
            <span className="text-sm font-medium text-pink-400">
              {getLabel(vocalDensity.hookyVsAtmospheric, 'Hooky', 'Atmospheric')}
            </span>
          </div>
          <div className="relative pt-1">
            <input
              type="range"
              min="0"
              max="100"
              value={vocalDensity.hookyVsAtmospheric}
              onChange={(e) => setVocalDensity('hookyVsAtmospheric', parseInt(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-pink-400
                [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(244,114,182,0.5)]
                [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-white/30 mt-1">
              <span>Catchy hooks</span>
              <span>Ambient textures</span>
            </div>
          </div>
        </div>

        {/* Lyric Clarity */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" />
              Lyric Clarity
            </label>
            <span className="text-sm font-medium text-pink-400">
              {getLabel(vocalDensity.lyricClarity, 'Clear lyrics', 'Abstract')}
            </span>
          </div>
          <div className="relative pt-1">
            <input
              type="range"
              min="0"
              max="100"
              value={vocalDensity.lyricClarity}
              onChange={(e) => setVocalDensity('lyricClarity', parseInt(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-pink-400
                [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(244,114,182,0.5)]
                [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-white/30 mt-1">
              <span>Clear, story-driven</span>
              <span>Abstract/buried</span>
            </div>
          </div>
        </div>
      </div>
    </WizardStep>
  )
}
