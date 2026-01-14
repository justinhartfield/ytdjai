'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Percent,
  Wand2,
  Plus,
  X,
  Trash2,
  Film,
  Music,
  Heart,
  Disc,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { WizardStep } from '../WizardStep'
import type { PromptTemplate } from '@/types'

const PROMPT_TEMPLATES: {
  id: PromptTemplate
  label: string
  description: string
  icon: React.ReactNode
}[] = [
  { id: 'make-it-cinematic', label: 'Cinematic', description: 'Epic, sweeping vibes', icon: <Film className="w-4 h-4" /> },
  { id: 'make-it-danceable', label: 'Danceable', description: 'Upbeat, groove-driven', icon: <Music className="w-4 h-4" /> },
  { id: 'make-it-intimate', label: 'Intimate', description: 'Soft, personal', icon: <Heart className="w-4 h-4" /> },
  { id: 'make-it-instrumental', label: 'Instrumental', description: 'No or minimal vocals', icon: <Disc className="w-4 h-4" /> },
  { id: 'make-it-90s-soundtrack', label: "90's Soundtrack", description: 'Nostalgic, retro', icon: <Sparkles className="w-4 h-4" /> }
]

export function VibeCraftingStep() {
  const {
    generationControls,
    addWeightedPhrase,
    removeWeightedPhrase,
    updateWeightedPhrase,
    togglePromptTemplate
  } = useYTDJStore()

  const [newPhrase, setNewPhrase] = useState('')
  const [newWeight, setNewWeight] = useState(50)

  const handleAddPhrase = () => {
    if (newPhrase.trim()) {
      addWeightedPhrase({ phrase: newPhrase.trim(), weight: newWeight })
      setNewPhrase('')
      setNewWeight(50)
    }
  }

  const totalWeight = generationControls.weightedPhrases.reduce((sum, p) => sum + p.weight, 0)

  return (
    <WizardStep
      title="How do you want to shape the mood?"
      subtitle="Blend vibes and apply style transforms"
    >
      {/* Vibe Blending Section */}
      <div className="space-y-4 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
        <div className="flex items-center gap-2">
          <Percent className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-purple-400">VIBE BLENDING</h3>
        </div>

        <p className="text-xs text-white/40">
          Mix multiple moods with weights, e.g. "late-night coding" 70% + "lofi jazz" 30%
        </p>

        {/* Existing phrases */}
        {generationControls.weightedPhrases.length > 0 && (
          <div className="space-y-2">
            {generationControls.weightedPhrases.map((phrase, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg group"
              >
                <span className="flex-1 text-sm text-purple-300 truncate">
                  "{phrase.phrase}"
                </span>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={phrase.weight}
                    onChange={(e) => updateWeightedPhrase(index, { weight: parseInt(e.target.value) })}
                    className="w-20 h-1 accent-purple-500"
                  />
                  <span className="text-xs font-mono text-purple-400 w-12 text-right">
                    {totalWeight > 0 ? Math.round((phrase.weight / totalWeight) * 100) : 0}%
                  </span>
                  <button
                    onClick={() => removeWeightedPhrase(index)}
                    className="opacity-0 group-hover:opacity-100 text-purple-400 hover:text-purple-300 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Add new phrase */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newPhrase}
            onChange={(e) => setNewPhrase(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPhrase()}
            placeholder='Add vibe... e.g. "midnight drive"'
            className="flex-1 px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
          />
          <input
            type="number"
            min="1"
            max="100"
            value={newWeight}
            onChange={(e) => setNewWeight(parseInt(e.target.value) || 50)}
            className="w-16 px-2 py-3 bg-black/50 border border-white/10 rounded-lg text-white text-center focus:outline-none focus:border-purple-500/50"
          />
          <button
            onClick={handleAddPhrase}
            disabled={!newPhrase.trim()}
            className="px-4 py-3 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Quick Transforms Section */}
      <div className="space-y-4 p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-cyan-400">QUICK TRANSFORMS</h3>
        </div>

        <p className="text-xs text-white/40">
          One-click style modifiers to shape your playlist
        </p>

        <div className="flex flex-wrap gap-2">
          {PROMPT_TEMPLATES.map((template) => {
            const isActive = generationControls.appliedTemplates.includes(template.id)
            return (
              <motion.button
                key={template.id}
                onClick={() => togglePromptTemplate(template.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border',
                  isActive
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                )}
              >
                {template.icon}
                <span>{template.label}</span>
                {isActive && <X className="w-3 h-3 ml-1" />}
              </motion.button>
            )
          })}
        </div>

        {generationControls.appliedTemplates.length > 0 && (
          <p className="text-xs text-cyan-400">
            {generationControls.appliedTemplates.length} transform{generationControls.appliedTemplates.length > 1 ? 's' : ''} active
          </p>
        )}
      </div>
    </WizardStep>
  )
}
