'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheck,
  Ban,
  Music,
  Plus,
  X,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { WizardStep } from '../WizardStep'
import type { ContentMode } from '@/types'

const CONTENT_MODES: { id: ContentMode; label: string; description: string; icon: React.ReactNode }[] = [
  { id: 'clean', label: 'Clean', description: 'Radio-safe, no explicit content', icon: <ShieldCheck className="w-5 h-5" /> },
  { id: 'explicit-ok', label: 'Explicit OK', description: 'Allow explicit tracks', icon: <Music className="w-5 h-5" /> },
  { id: 'family', label: 'Family', description: 'Family-friendly only', icon: <ShieldCheck className="w-5 h-5" /> }
]

const AVOID_SUGGESTIONS = [
  'sad breakup songs',
  'country twang',
  'aggressive drops',
  'slow ballads',
  'heavy metal',
  'christmas music'
]

export function BoundariesStep() {
  const {
    generationControls,
    setGenerationControls,
    addAvoidConcept,
    removeAvoidConcept
  } = useYTDJStore()

  const [avoidInput, setAvoidInput] = useState('')

  const handleAddAvoid = () => {
    if (avoidInput.trim()) {
      addAvoidConcept(avoidInput.trim())
      setAvoidInput('')
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    if (!generationControls.avoidConcepts.includes(suggestion)) {
      addAvoidConcept(suggestion)
    }
  }

  return (
    <WizardStep
      title="Any content preferences?"
      subtitle="Set content filters and concepts to avoid"
    >
      {/* Content Mode Selection */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-green-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          CONTENT FILTER
        </h3>

        <div className="grid grid-cols-3 gap-3">
          {CONTENT_MODES.map((mode) => {
            const isSelected = generationControls.contentMode === mode.id
            return (
              <motion.button
                key={mode.id}
                onClick={() => setGenerationControls({ contentMode: mode.id })}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl transition-all border',
                  isSelected
                    ? 'bg-green-500/20 border-green-500/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                )}
              >
                <span className={cn(
                  isSelected ? 'text-green-400' : 'text-white/40'
                )}>
                  {mode.icon}
                </span>
                <span className={cn(
                  'text-sm font-bold',
                  isSelected ? 'text-green-400' : 'text-white'
                )}>
                  {mode.label}
                </span>
                <span className="text-[10px] text-white/40 text-center">
                  {mode.description}
                </span>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-black" />
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Avoid Concepts */}
      <div className="space-y-4 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
        <div className="flex items-center gap-2">
          <Ban className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-bold text-red-400">AVOID THESE</h3>
        </div>

        <p className="text-xs text-white/40">
          Concepts, genres, or moods you want to exclude
        </p>

        {/* Current avoid concepts */}
        {generationControls.avoidConcepts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {generationControls.avoidConcepts.map((concept, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full"
              >
                <span className="text-xs text-red-400">{concept}</span>
                <button
                  onClick={() => removeAvoidConcept(index)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Add input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={avoidInput}
            onChange={(e) => setAvoidInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddAvoid()}
            placeholder="Type to add concepts to avoid..."
            className="flex-1 px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50"
          />
          <button
            onClick={handleAddAvoid}
            disabled={!avoidInput.trim()}
            className="px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Suggestions */}
        <div className="space-y-2">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Quick adds:</p>
          <div className="flex flex-wrap gap-2">
            {AVOID_SUGGESTIONS
              .filter(s => !generationControls.avoidConcepts.includes(s))
              .slice(0, 4)
              .map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-white/50 hover:bg-white/10 hover:text-white transition-all"
                >
                  + {suggestion}
                </button>
              ))}
          </div>
        </div>
      </div>
    </WizardStep>
  )
}
