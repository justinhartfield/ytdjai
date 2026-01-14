'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Clock, Check, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { generatePlaylist } from '@/lib/ai-service'
import type { AIConstraints } from '@/types'
import { MobileBottomSheet } from './MobileBottomSheet'

const VIBE_TAGS = [
  'LATE NIGHT', 'CYBERPUNK', 'EUPHORIC', 'DARK', 'MELODIC', 'DEEP BASS'
]

const ARC_TEMPLATES = [
  { id: 'mountain', name: 'THE MOUNTAIN', desc: 'Build → Peak → Cool down', path: 'M 0 40 Q 25 35, 50 10 Q 75 35, 100 40' },
  { id: 'slow-burn', name: 'SLOW BURN', desc: 'Steady energy increase', path: 'M 0 40 Q 50 30, 100 10' },
  { id: 'rollercoaster', name: 'ROLLERCOASTER', desc: 'Dynamic ups & downs', path: 'M 0 35 Q 15 15, 30 30 Q 45 10, 60 25 Q 75 5, 100 20' },
  { id: 'plateau', name: 'PLATEAU', desc: 'Fast warm-up, sustained peak', path: 'M 0 40 Q 15 20, 25 15 L 100 15' }
]

const DURATIONS = [30, 45, 60, 90]

interface MobileLaunchPadProps {
  onComplete: () => void
}

export function MobileLaunchPad({ onComplete }: MobileLaunchPadProps) {
  const [prompt, setPrompt] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [duration, setDuration] = useState(45)
  const [selectedArc, setSelectedArc] = useState('mountain')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showArcPicker, setShowArcPicker] = useState(false)

  const { aiProvider, updateSetWithPrompt, setIsGenerating: setStoreGenerating, constraints } = useYTDJStore()

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    setStoreGenerating(true)

    const tagsText = selectedTags.length > 0 ? selectedTags.join(', ') : ''
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
        updateSetWithPrompt(result.playlist, fullPrompt)
        onComplete()
      }
    } catch (error) {
      console.error('Failed to generate playlist:', error)
    } finally {
      setIsGenerating(false)
      setStoreGenerating(false)
    }
  }, [prompt, selectedTags, selectedArc, duration, aiProvider, constraints, updateSetWithPrompt, setStoreGenerating, onComplete])

  const selectedArcTemplate = ARC_TEMPLATES.find(a => a.id === selectedArc)

  return (
    <div className="h-screen bg-[#05060f] text-white overflow-auto">
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 242, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <div className="relative z-10 p-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="inline-block px-3 py-1 rounded bg-cyan-500/20 border border-cyan-500/30">
            <span className="text-[10px] font-bold tracking-widest text-cyan-400">MOBILE MODE</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight">
            <span className="text-white italic">CRAFT YOUR</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300 italic">
              SONIC JOURNEY
            </span>
          </h1>
        </div>

        {/* Prompt Card */}
        <div className="bg-[#0a0c1c]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5 space-y-4">
          <h3 className="text-[10px] font-bold tracking-widest text-cyan-400">
            DESCRIBE THE VIBE
          </h3>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. A neon-lit rainy night drive through Shibuya..."
            className="w-full h-24 bg-transparent text-white/70 placeholder:text-white/40 text-base leading-relaxed resize-none focus:outline-none"
          />

          {/* Vibe Tags */}
          <div className="flex flex-wrap gap-2">
            {VIBE_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  'px-3 py-2 rounded-full text-[10px] font-bold tracking-wider',
                  'border transition-all',
                  selectedTags.includes(tag)
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                    : 'bg-white/5 border-white/10 text-white/60'
                )}
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Duration & Arc */}
        <div className="grid grid-cols-2 gap-4">
          {/* Duration */}
          <div className="bg-[#0a0c1c]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold tracking-widest text-white/50">DURATION</span>
              <span className="text-sm font-bold text-white">{duration} MIN</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={cn(
                    'py-2 rounded-lg text-sm font-bold transition-all',
                    duration === d ? 'bg-white text-black' : 'bg-white/5 text-white/60'
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Arc Picker */}
          <div className="bg-[#0a0c1c]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold tracking-widest text-white/50">ENERGY ARC</span>
            </div>
            <button
              onClick={() => setShowArcPicker(true)}
              className="w-full bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-all border border-white/10"
            >
              <div className="w-full h-8 mb-1">
                <svg viewBox="0 0 100 50" className="w-full h-full">
                  <path
                    d={selectedArcTemplate?.path}
                    fill="none"
                    stroke="#00f2ff"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="text-xs font-bold text-white">{selectedArcTemplate?.name}</p>
            </button>
          </div>
        </div>

        {/* Generate Button */}
        <motion.button
          onClick={handleGenerate}
          disabled={isGenerating}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'w-full py-5 rounded-2xl font-black text-lg tracking-wider',
            'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black',
            'shadow-[0_0_30px_rgba(0,242,255,0.3)]',
            'flex items-center justify-center gap-3',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'sticky bottom-6'
          )}
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              GENERATING...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              GENERATE SET
            </>
          )}
        </motion.button>

        <p className="text-center text-xs text-white/40">
          <Clock className="w-3 h-3 inline mr-1" />
          BUILD TIME: {'<'} 8 SECONDS
        </p>
      </div>

      {/* Arc Picker Bottom Sheet */}
      <MobileBottomSheet
        isOpen={showArcPicker}
        onClose={() => setShowArcPicker(false)}
        title="Choose Energy Arc"
      >
        <div className="p-6 space-y-3">
          {ARC_TEMPLATES.map((arc) => (
            <button
              key={arc.id}
              onClick={() => {
                setSelectedArc(arc.id)
                setShowArcPicker(false)
              }}
              className={cn(
                'w-full flex items-center gap-4 p-4 rounded-xl transition-all',
                'border',
                selectedArc === arc.id
                  ? 'bg-cyan-500/10 border-cyan-500/50'
                  : 'bg-white/5 border-white/10'
              )}
            >
              <div className="w-16 h-10 flex-shrink-0">
                <svg viewBox="0 0 100 50" className="w-full h-full">
                  <path
                    d={arc.path}
                    fill="none"
                    stroke={selectedArc === arc.id ? '#00f2ff' : '#ffffff40'}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-white text-sm">{arc.name}</p>
                <p className="text-xs text-white/50">{arc.desc}</p>
              </div>
              {selectedArc === arc.id && (
                <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center">
                  <Check className="w-4 h-4 text-black" />
                </div>
              )}
            </button>
          ))}
        </div>
      </MobileBottomSheet>
    </div>
  )
}
