'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Zap, Clock, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { generatePlaylist } from '@/lib/ai-service'
import { haptics } from '@/lib/haptics'
import type { AIConstraints } from '@/types'

const VIBE_TAGS = [
  { id: 'late-night', label: 'LATE NIGHT', emoji: '🌙' },
  { id: 'cyberpunk', label: 'CYBERPUNK', emoji: '🤖' },
  { id: 'euphoric', label: 'EUPHORIC', emoji: '✨' },
  { id: 'dark', label: 'DARK', emoji: '🖤' },
  { id: 'melodic', label: 'MELODIC', emoji: '🎵' },
  { id: 'deep-bass', label: 'DEEP BASS', emoji: '🔊' }
]

const DURATIONS = [
  { value: 30, label: '30m' },
  { value: 45, label: '45m' },
  { value: 60, label: '60m' },
  { value: 90, label: '90m' }
]

const ARC_TEMPLATES = [
  { id: 'mountain', name: 'MOUNTAIN', desc: 'Build → Peak → Cool', path: 'M 0 35 Q 25 30, 50 8 Q 75 30, 100 35' },
  { id: 'slow-burn', name: 'SLOW BURN', desc: 'Steady rise', path: 'M 0 38 Q 50 25, 100 8' },
  { id: 'rollercoaster', name: 'COASTER', desc: 'Dynamic waves', path: 'M 0 30 Q 15 12, 30 25 Q 45 8, 60 20 Q 75 5, 100 15' },
  { id: 'plateau', name: 'PLATEAU', desc: 'Quick peak, hold', path: 'M 0 38 Q 15 15, 25 10 L 100 10' }
]

interface LandscapeLaunchPadProps {
  onComplete: () => void
}

export function LandscapeLaunchPad({ onComplete }: LandscapeLaunchPadProps) {
  const [prompt, setPrompt] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [duration, setDuration] = useState(45)
  const [selectedArc, setSelectedArc] = useState('mountain')
  const [isGenerating, setIsGenerating] = useState(false)

  const { aiProvider, updateSetWithPrompt, setIsGenerating: setStoreGenerating, constraints } = useYTDJStore()

  const toggleTag = (tagId: string) => {
    haptics.light()
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    )
  }

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    setStoreGenerating(true)
    haptics.medium()

    const selectedTagLabels = selectedTags.map(id => VIBE_TAGS.find(t => t.id === id)?.label).filter(Boolean)
    const tagsText = selectedTagLabels.length > 0 ? selectedTagLabels.join(', ') : ''
    const arcTemplate = ARC_TEMPLATES.find(a => a.id === selectedArc)
    const arcText = arcTemplate ? `Energy arc: ${arcTemplate.name.toLowerCase()} - ${arcTemplate.desc}` : ''

    const fullPrompt = [
      prompt || 'Create an amazing DJ set',
      tagsText && `Style: ${tagsText}`,
      arcText,
      `Duration: approximately ${duration} minutes`
    ].filter(Boolean).join('. ')

    const trackCount = Math.round(duration / 5)

    try {
      const result = await generatePlaylist({
        prompt: fullPrompt,
        constraints: {
          trackCount,
          energyRange: { min: 20, max: 80 },
          energyTolerance: constraints.energyTolerance,
          syncopation: constraints.syncopation,
          keyMatch: constraints.keyMatch,
          artistDiversity: constraints.diversity,
          discovery: constraints.discovery,
          activeDecades: constraints.activeDecades,
          blacklist: constraints.blacklist
        } as AIConstraints,
        provider: aiProvider
      })

      if (result.success && result.playlist) {
        haptics.success()
        updateSetWithPrompt(result.playlist, fullPrompt)
        onComplete()
      } else {
        haptics.error()
      }
    } catch (error) {
      console.error('Failed to generate playlist:', error)
      haptics.error()
    } finally {
      setIsGenerating(false)
      setStoreGenerating(false)
    }
  }, [prompt, selectedTags, selectedArc, duration, aiProvider, constraints, updateSetWithPrompt, setStoreGenerating, onComplete])

  return (
    <div className="h-full w-full flex flex-col p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            <span className="text-white">CRAFT YOUR</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300 ml-2">SET</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30">
            <span className="text-[10px] font-bold tracking-widest text-cyan-400">LANDSCAPE</span>
          </div>
        </div>
      </div>

      {/* Main Content - Two Columns */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Column - Prompt & Tags */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Prompt Input */}
          <div className="bg-[#0a0c1c]/80 backdrop-blur-xl rounded-xl border border-white/10 p-4 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-[10px] font-bold tracking-widest text-cyan-400">DESCRIBE THE VIBE</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A neon-lit rainy night drive through Shibuya, hypnotic bass and ethereal melodies..."
              className="w-full h-[calc(100%-32px)] bg-transparent text-white/80 placeholder:text-white/30 text-sm leading-relaxed resize-none focus:outline-none"
            />
          </div>

          {/* Vibe Tags - Horizontal Scroll */}
          <div className="bg-[#0a0c1c]/60 backdrop-blur-xl rounded-xl border border-white/5 p-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {VIBE_TAGS.map((tag) => (
                <motion.button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold tracking-wide',
                    'border transition-all whitespace-nowrap',
                    selectedTags.includes(tag.id)
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(0,242,255,0.2)]'
                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  )}
                >
                  <span className="mr-1">{tag.emoji}</span>
                  {tag.label}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Duration, Arc & Generate */}
        <div className="w-[280px] flex flex-col gap-3">
          {/* Duration */}
          <div className="bg-[#0a0c1c]/80 backdrop-blur-xl rounded-xl border border-white/10 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-3 h-3 text-white/50" />
              <span className="text-[10px] font-bold tracking-widest text-white/50">DURATION</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {DURATIONS.map((d) => (
                <motion.button
                  key={d.value}
                  onClick={() => {
                    haptics.light()
                    setDuration(d.value)
                  }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'py-2 rounded-lg text-sm font-bold transition-all',
                    duration === d.value
                      ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                  )}
                >
                  {d.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Energy Arc */}
          <div className="bg-[#0a0c1c]/80 backdrop-blur-xl rounded-xl border border-white/10 p-3 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-3 h-3 text-white/50" />
              <span className="text-[10px] font-bold tracking-widest text-white/50">ENERGY ARC</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ARC_TEMPLATES.map((arc) => (
                <motion.button
                  key={arc.id}
                  onClick={() => {
                    haptics.light()
                    setSelectedArc(arc.id)
                  }}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    'relative p-2 rounded-lg border transition-all text-left',
                    selectedArc === arc.id
                      ? 'bg-cyan-500/10 border-cyan-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  )}
                >
                  <svg viewBox="0 0 100 40" className="w-full h-6 mb-1">
                    <path
                      d={arc.path}
                      fill="none"
                      stroke={selectedArc === arc.id ? '#00f2ff' : 'rgba(255,255,255,0.3)'}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <p className="text-[10px] font-bold text-white truncate">{arc.name}</p>
                  {selectedArc === arc.id && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-black" />
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <motion.button
            onClick={handleGenerate}
            disabled={isGenerating}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'w-full py-4 rounded-xl font-black text-base tracking-wider',
              'bg-gradient-to-r from-cyan-500 via-cyan-400 to-teal-400 text-black',
              'shadow-[0_0_30px_rgba(0,242,255,0.4)]',
              'flex items-center justify-center gap-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'hover:shadow-[0_0_40px_rgba(0,242,255,0.6)] transition-shadow'
            )}
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>GENERATING...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>GENERATE SET</span>
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  )
}
