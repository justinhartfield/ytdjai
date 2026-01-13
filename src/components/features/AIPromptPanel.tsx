'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Send,
  Settings2,
  Music,
  Clock,
  Zap,
  ChevronDown,
  ChevronUp,
  X,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Textarea, Slider, Badge, Input } from '@/components/ui'
import { useYTDJStore } from '@/store'
import type { AIConstraints, Mood } from '@/types'

const MOOD_OPTIONS: { value: Mood; label: string; color: string }[] = [
  { value: 'energetic', label: 'Energetic', color: 'bg-orange-500' },
  { value: 'chill', label: 'Chill', color: 'bg-blue-500' },
  { value: 'dark', label: 'Dark', color: 'bg-purple-500' },
  { value: 'uplifting', label: 'Uplifting', color: 'bg-yellow-500' },
  { value: 'melancholic', label: 'Melancholic', color: 'bg-indigo-500' },
  { value: 'aggressive', label: 'Aggressive', color: 'bg-red-500' },
  { value: 'romantic', label: 'Romantic', color: 'bg-pink-500' },
  { value: 'psychedelic', label: 'Psychedelic', color: 'bg-green-500' }
]

interface AIPromptPanelProps {
  onGenerate: (prompt: string, constraints: Partial<AIConstraints>) => Promise<void>
  isLoading?: boolean
  className?: string
}

export function AIPromptPanel({
  onGenerate,
  isLoading = false,
  className
}: AIPromptPanelProps) {
  const [prompt, setPrompt] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [constraints, setConstraints] = useState<Partial<AIConstraints>>({
    trackCount: 8,
    transitionQualityThreshold: 0.7,
    moods: [],
    excludeArtists: []
  })
  const [newExcludedArtist, setNewExcludedArtist] = useState('')

  const { aiProvider, isGenerating } = useYTDJStore()

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isLoading) return
    await onGenerate(prompt, constraints)
  }, [prompt, constraints, isLoading, onGenerate])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit()
    }
  }, [handleSubmit])

  const toggleMood = (mood: Mood) => {
    setConstraints(prev => ({
      ...prev,
      moods: prev.moods?.includes(mood)
        ? prev.moods.filter(m => m !== mood)
        : [...(prev.moods || []), mood]
    }))
  }

  const addExcludedArtist = () => {
    if (newExcludedArtist.trim()) {
      setConstraints(prev => ({
        ...prev,
        excludeArtists: [...(prev.excludeArtists || []), newExcludedArtist.trim()]
      }))
      setNewExcludedArtist('')
    }
  }

  const removeExcludedArtist = (artist: string) => {
    setConstraints(prev => ({
      ...prev,
      excludeArtists: prev.excludeArtists?.filter(a => a !== artist)
    }))
  }

  return (
    <div className={cn('bg-[#0a0c1c] rounded-xl border border-white/10', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-magenta-500/20">
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">AI Set Generator</h3>
            <p className="text-xs text-white/50">Powered by {aiProvider === 'openai' ? 'GPT-4' : aiProvider === 'claude' ? 'Claude' : 'Gemini'}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-white/60"
        >
          <Settings2 className="w-4 h-4 mr-1" />
          Advanced
          {showAdvanced ? (
            <ChevronUp className="w-4 h-4 ml-1" />
          ) : (
            <ChevronDown className="w-4 h-4 ml-1" />
          )}
        </Button>
      </div>

      {/* Prompt Input */}
      <div className="p-4">
        <Textarea
          placeholder="Describe your perfect DJ set... e.g., 'A 45-minute progressive house journey that starts deep and melodic, builds through peak-time energy, and ends with euphoric vocal tracks'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          className="resize-none"
        />
        <p className="mt-2 text-xs text-white/40">
          Press ⌘+Enter to generate
        </p>
      </div>

      {/* Advanced Settings */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-6 border-t border-white/10 pt-4">
              {/* Track Count & Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Music className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-medium text-white">Track Count</span>
                  </div>
                  <Slider
                    min={4}
                    max={20}
                    value={constraints.trackCount}
                    onChange={(e) => setConstraints(prev => ({
                      ...prev,
                      trackCount: parseInt(e.target.value)
                    }))}
                    valueLabel={`${constraints.trackCount} tracks`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-magenta-400" />
                    <span className="text-sm font-medium text-white">Transition Quality</span>
                  </div>
                  <Slider
                    min={0}
                    max={100}
                    value={(constraints.transitionQualityThreshold || 0.7) * 100}
                    onChange={(e) => setConstraints(prev => ({
                      ...prev,
                      transitionQualityThreshold: parseInt(e.target.value) / 100
                    }))}
                    valueLabel={`${Math.round((constraints.transitionQualityThreshold || 0.7) * 100)}%`}
                  />
                </div>
              </div>

              {/* Energy Range */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium text-white">Energy Range</span>
                </div>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    value={constraints.energyRange?.min || 20}
                    onChange={(e) => setConstraints(prev => ({
                      ...prev,
                      energyRange: { ...prev.energyRange!, min: parseInt(e.target.value) }
                    }))}
                    className="w-24"
                  />
                  <span className="text-white/50">to</span>
                  <Input
                    type="number"
                    value={constraints.energyRange?.max || 80}
                    onChange={(e) => setConstraints(prev => ({
                      ...prev,
                      energyRange: { ...prev.energyRange!, max: parseInt(e.target.value) }
                    }))}
                    className="w-24"
                  />
                  <span className="text-sm text-white/50">(1-100)</span>
                </div>
              </div>

              {/* Mood Selection */}
              <div>
                <span className="text-sm font-medium text-white block mb-2">Mood Tags</span>
                <div className="flex flex-wrap gap-2">
                  {MOOD_OPTIONS.map((mood) => (
                    <button
                      key={mood.value}
                      onClick={() => toggleMood(mood.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium',
                        'transition-all duration-200 border',
                        constraints.moods?.includes(mood.value)
                          ? `${mood.color} border-transparent text-white`
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      )}
                    >
                      {mood.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exclude Artists */}
              <div>
                <span className="text-sm font-medium text-white block mb-2">Exclude Artists</span>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Artist name..."
                    value={newExcludedArtist}
                    onChange={(e) => setNewExcludedArtist(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addExcludedArtist()}
                    className="flex-1"
                  />
                  <Button
                    variant="secondary"
                    onClick={addExcludedArtist}
                    disabled={!newExcludedArtist.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {constraints.excludeArtists && constraints.excludeArtists.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {constraints.excludeArtists.map((artist) => (
                      <Badge key={artist} removable onRemove={() => removeExcludedArtist(artist)}>
                        {artist}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate Button */}
      <div className="p-4 border-t border-white/10">
        <Button
          variant="primary"
          className="w-full"
          onClick={handleSubmit}
          isLoading={isLoading || isGenerating}
          disabled={!prompt.trim() || isLoading || isGenerating}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Set
        </Button>
      </div>
    </div>
  )
}
