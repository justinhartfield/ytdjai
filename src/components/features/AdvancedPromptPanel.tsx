'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  X,
  Trash2,
  Wand2,
  FileText,
  Ban,
  Sparkles,
  Film,
  Music,
  Heart,
  Disc,
  ChevronDown,
  ChevronUp,
  Percent
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import type { PromptTemplate, WeightedPhrase } from '@/types'

const PROMPT_TEMPLATES: {
  id: PromptTemplate
  label: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    id: 'make-it-cinematic',
    label: 'Make it cinematic',
    description: 'Epic, sweeping, soundtrack vibes',
    icon: <Film className="w-3.5 h-3.5" />
  },
  {
    id: 'make-it-danceable',
    label: 'Make it danceable',
    description: 'Upbeat, rhythmic, groove-driven',
    icon: <Music className="w-3.5 h-3.5" />
  },
  {
    id: 'make-it-intimate',
    label: 'Make it intimate',
    description: 'Soft, personal, close-feeling',
    icon: <Heart className="w-3.5 h-3.5" />
  },
  {
    id: 'make-it-instrumental',
    label: 'Make it instrumental',
    description: 'No or minimal vocals',
    icon: <Disc className="w-3.5 h-3.5" />
  },
  {
    id: 'make-it-90s-soundtrack',
    label: "90's soundtrack",
    description: 'Nostalgic, retro movie vibes',
    icon: <Sparkles className="w-3.5 h-3.5" />
  }
]

interface AdvancedPromptPanelProps {
  className?: string
}

export function AdvancedPromptPanel({ className }: AdvancedPromptPanelProps) {
  const {
    generationControls,
    addWeightedPhrase,
    removeWeightedPhrase,
    updateWeightedPhrase,
    addAvoidConcept,
    removeAvoidConcept,
    togglePromptTemplate,
    setLongFormInput,
    setGenerationControls
  } = useYTDJStore()

  const [newPhrase, setNewPhrase] = useState('')
  const [newWeight, setNewWeight] = useState(50)
  const [avoidInput, setAvoidInput] = useState('')
  const [showLongForm, setShowLongForm] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    blending: true,
    avoid: false,
    templates: true,
    longForm: false
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleAddPhrase = () => {
    if (newPhrase.trim()) {
      addWeightedPhrase({ phrase: newPhrase.trim(), weight: newWeight })
      setNewPhrase('')
      setNewWeight(50)
    }
  }

  const handleAddAvoid = () => {
    if (avoidInput.trim()) {
      addAvoidConcept(avoidInput.trim())
      setAvoidInput('')
    }
  }

  // Calculate total weight for normalization display
  const totalWeight = generationControls.weightedPhrases.reduce((sum, p) => sum + p.weight, 0)

  return (
    <div className={cn('space-y-4', className)}>
      {/* Multi-Phrase Blending Section */}
      <div className="bg-[#0a0c1c]/80 backdrop-blur-xl rounded-xl border border-white/10">
        <button
          onClick={() => toggleSection('blending')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Percent className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold tracking-wider text-white">
                VIBE BLENDING
              </h3>
              <p className="text-[10px] text-white/40">Mix multiple vibes with weights</p>
            </div>
          </div>
          {expandedSections.blending ? (
            <ChevronUp className="w-4 h-4 text-white/40" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/40" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.blending && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                {/* Example hint */}
                <p className="text-[10px] text-white/30 italic">
                  e.g. "late-night coding" 70% + "lofi jazz" 30%
                </p>

                {/* Existing phrases */}
                {generationControls.weightedPhrases.length > 0 && (
                  <div className="space-y-2">
                    {generationControls.weightedPhrases.map((phrase, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg group"
                      >
                        <span className="flex-1 text-sm text-purple-300 truncate">
                          "{phrase.phrase}"
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="1"
                            max="100"
                            value={phrase.weight}
                            onChange={(e) => updateWeightedPhrase(index, { weight: parseInt(e.target.value) })}
                            className="w-16 h-1 accent-purple-500"
                          />
                          <span className="text-xs font-mono text-purple-400 w-10 text-right">
                            {totalWeight > 0 ? Math.round((phrase.weight / totalWeight) * 100) : 0}%
                          </span>
                          <button
                            onClick={() => removeWeightedPhrase(index)}
                            className="opacity-0 group-hover:opacity-100 text-purple-400 hover:text-purple-300 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
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
                    placeholder='Add vibe phrase... e.g. "midnight drive"'
                    className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                  />
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newWeight}
                    onChange={(e) => setNewWeight(parseInt(e.target.value) || 50)}
                    className="w-16 px-2 py-2 bg-black/50 border border-white/10 rounded-lg text-sm text-white text-center focus:outline-none focus:border-purple-500/50"
                  />
                  <button
                    onClick={handleAddPhrase}
                    disabled={!newPhrase.trim()}
                    className="px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Negative Prompting (Avoid) Section */}
      <div className="bg-[#0a0c1c]/80 backdrop-blur-xl rounded-xl border border-white/10">
        <button
          onClick={() => toggleSection('avoid')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Ban className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold tracking-wider text-white">
                AVOID / DON'T MEAN THIS
              </h3>
              <p className="text-[10px] text-white/40">Negative prompts to exclude</p>
            </div>
          </div>
          {generationControls.avoidConcepts.length > 0 && (
            <span className="text-[10px] font-bold text-red-400 mr-2">
              {generationControls.avoidConcepts.length}
            </span>
          )}
          {expandedSections.avoid ? (
            <ChevronUp className="w-4 h-4 text-white/40" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/40" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.avoid && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                <p className="text-[10px] text-white/30 italic">
                  e.g. "sad breakup", "country twang", "aggressive drops"
                </p>

                {/* Existing avoid concepts */}
                {generationControls.avoidConcepts.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {generationControls.avoidConcepts.map((concept, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full group"
                      >
                        <span className="text-xs text-red-400">{concept}</span>
                        <button
                          onClick={() => removeAvoidConcept(index)}
                          className="opacity-60 hover:opacity-100 text-red-400 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add avoid input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={avoidInput}
                    onChange={(e) => setAvoidInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAvoid()}
                    placeholder="Add concept to avoid..."
                    className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50"
                  />
                  <button
                    onClick={handleAddAvoid}
                    disabled={!avoidInput.trim()}
                    className="px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Smart Prompt Templates */}
      <div className="bg-[#0a0c1c]/80 backdrop-blur-xl rounded-xl border border-white/10">
        <button
          onClick={() => toggleSection('templates')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold tracking-wider text-white">
                QUICK TRANSFORMS
              </h3>
              <p className="text-[10px] text-white/40">One-click style modifiers</p>
            </div>
          </div>
          {expandedSections.templates ? (
            <ChevronUp className="w-4 h-4 text-white/40" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/40" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.templates && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4">
                <div className="flex flex-wrap gap-2">
                  {PROMPT_TEMPLATES.map((template) => {
                    const isActive = generationControls.appliedTemplates.includes(template.id)
                    return (
                      <button
                        key={template.id}
                        onClick={() => togglePromptTemplate(template.id)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border',
                          isActive
                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                        )}
                        title={template.description}
                      >
                        {template.icon}
                        {template.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Paragraph/Poem Mode */}
      <div className="bg-[#0a0c1c]/80 backdrop-blur-xl rounded-xl border border-white/10">
        <button
          onClick={() => toggleSection('longForm')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-xs font-bold tracking-wider text-white">
                PASTE A PARAGRAPH
              </h3>
              <p className="text-[10px] text-white/40">Diary entry, poem, scene description</p>
            </div>
          </div>
          {generationControls.longFormInput && (
            <span className="text-[10px] font-bold text-amber-400 mr-2">
              SET
            </span>
          )}
          {expandedSections.longForm ? (
            <ChevronUp className="w-4 h-4 text-white/40" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/40" />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.longForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                <p className="text-[10px] text-white/30 italic">
                  Paste any text and we'll distill it into musical attributes
                </p>
                <textarea
                  value={generationControls.longFormInput}
                  onChange={(e) => setLongFormInput(e.target.value)}
                  placeholder="Paste a diary entry, poem, scene description, book excerpt..."
                  className="w-full h-32 px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 resize-none"
                />
                {generationControls.longFormInput && (
                  <button
                    onClick={() => setLongFormInput('')}
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Clear text
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Emoji/Vibes Support Notice */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-lg">
        <span className="text-base">✨🖤🌧️</span>
        <p className="text-[10px] text-white/50">
          <span className="text-pink-400 font-medium">Emoji-powered:</span> Use emojis naturally in your prompts - they're treated as strong mood/energy signals
        </p>
      </div>
    </div>
  )
}
