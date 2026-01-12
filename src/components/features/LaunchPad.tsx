'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Check, Heart, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { generatePlaylist } from '@/lib/ai-service'
import type { AIConstraints } from '@/types'

const VIBE_TAGS = [
  'CYBERPUNK',
  'LATE NIGHT',
  'CINEMATIC',
  'DRIVING',
  'DEEP BASS',
  'EUPHORIC',
  'DARK',
  'MELODIC',
  'MINIMAL',
  'VOCAL'
]

const ARC_TEMPLATES = [
  {
    id: 'mountain',
    name: 'THE MOUNTAIN',
    description: 'Start slow, peak at the midpoint, then cool down.',
    path: 'M 0 40 Q 25 35, 50 10 Q 75 35, 100 40'
  },
  {
    id: 'slow-burn',
    name: 'SLOW BURN',
    description: 'Steady incremental increase in energy until the finale.',
    path: 'M 0 40 Q 50 30, 100 10'
  },
  {
    id: 'rollercoaster',
    name: 'THE ROLLERCOASTER',
    description: 'Dynamic high-energy shifts and rhythmic breaks.',
    path: 'M 0 35 Q 15 15, 30 30 Q 45 10, 60 25 Q 75 5, 100 20'
  },
  {
    id: 'plateau',
    name: 'THE PLATEAU',
    description: 'Warm up fast and maintain peak intensity throughout.',
    path: 'M 0 40 Q 15 20, 25 15 L 100 15'
  }
]

const DURATIONS = [30, 45, 60, 90]

const TRENDING_SETS = [
  { name: 'Midnight Drift Vol. 4', author: '@CyberVibe', time: '1h ago', likes: 242 },
  { name: 'Sunset Sessions', author: '@DeepHouse', time: '3h ago', likes: 189 },
  { name: 'Warehouse Techno', author: '@BerlinBeats', time: '5h ago', likes: 156 }
]

interface LaunchPadProps {
  onComplete: () => void
}

export function LaunchPad({ onComplete }: LaunchPadProps) {
  const [prompt, setPrompt] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [novelty, setNovelty] = useState(50)
  const [duration, setDuration] = useState(45)
  const [selectedArc, setSelectedArc] = useState('mountain')
  const [bpmRange, setBpmRange] = useState({ min: 80, max: 165 })
  const [isGenerating, setIsGenerating] = useState(false)

  const { aiProvider, updateSetWithPrompt, setIsGenerating: setStoreGenerating } = useYTDJStore()

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const getNoveltyLabel = () => {
    if (novelty < 33) return 'Familiar'
    if (novelty < 66) return 'Balanced'
    return 'Adventurous'
  }

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    setStoreGenerating(true)

    // Build the prompt from selections
    const tagsText = selectedTags.length > 0 ? selectedTags.join(', ') : ''
    const arcTemplate = ARC_TEMPLATES.find(a => a.id === selectedArc)
    const arcText = arcTemplate ? `Energy arc: ${arcTemplate.name.toLowerCase()} - ${arcTemplate.description}` : ''

    const fullPrompt = [
      prompt || 'Create an amazing DJ set',
      tagsText && `Style: ${tagsText}`,
      arcText,
      `Duration: approximately ${duration} minutes`,
      `BPM range: ${bpmRange.min}-${bpmRange.max}`,
      novelty > 66 ? 'Include deep cuts and obscure tracks' : novelty < 33 ? 'Focus on well-known hits' : 'Mix of familiar and fresh tracks'
    ].filter(Boolean).join('. ')

    const trackCount = Math.round(duration / 5) // Roughly 5 min per track

    try {
      const result = await generatePlaylist({
        prompt: fullPrompt,
        constraints: {
          trackCount,
          bpmRange,
          novelty
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
  }, [prompt, selectedTags, selectedArc, duration, bpmRange, novelty, aiProvider, updateSetWithPrompt, setStoreGenerating, onComplete])

  return (
    <div className="min-h-screen bg-[#05060f] text-white overflow-auto">
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 242, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 242, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column - Step 1 */}
          <div className="space-y-8">
            {/* Step Badge */}
            <div className="inline-block px-4 py-1.5 rounded bg-cyan-500/20 border border-cyan-500/30">
              <span className="text-xs font-bold tracking-widest text-cyan-400">
                STEP 1: SET THE VIBE
              </span>
            </div>

            {/* Main Headline */}
            <div className="space-y-2">
              <h1 className="text-5xl lg:text-6xl font-black tracking-tight">
                <span className="text-white italic">CRAFT</span>
              </h1>
              <h1 className="text-5xl lg:text-6xl font-black tracking-tight">
                <span className="text-white italic">YOUR</span>
              </h1>
              <h1 className="text-5xl lg:text-6xl font-black tracking-tight">
                <span className="text-cyan-400 italic">SONIC</span>
              </h1>
              <h1 className="text-5xl lg:text-6xl font-black tracking-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300 italic">
                  JOURNEY
                </span>
              </h1>
            </div>

            {/* Atmosphere Prompt Card */}
            <div className="bg-[#0a0c1c]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <h3 className="text-xs font-bold tracking-widest text-cyan-400 mb-4">
                THE ATMOSPHERE PROMPT
              </h3>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. A neon-lit rainy night drive through Shibuya. Melancholic but driving, heavy bass, vintage analog synths..."
                className="w-full h-32 bg-transparent text-white/70 placeholder:text-white/40 text-lg leading-relaxed resize-none focus:outline-none"
              />

              {/* Vibe Tags */}
              <div className="flex flex-wrap gap-2 mt-6">
                {VIBE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      'px-4 py-2 rounded-full text-xs font-bold tracking-wider',
                      'border transition-all duration-200',
                      selectedTags.includes(tag)
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="grid grid-cols-2 gap-4">
              {/* Novelty Slider */}
              <div className="bg-[#0a0c1c]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold tracking-widest text-white/50">
                    CURATION NOVELTY
                  </span>
                  <span className="text-sm font-bold text-cyan-400">
                    {getNoveltyLabel()}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={novelty}
                  onChange={(e) => setNovelty(parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-cyan-400
                    [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(0,242,255,0.8)]"
                />
                <p className="text-xs text-white/40 mt-3">
                  Determines how much the AI prioritizes hits vs. obscure tracks.
                </p>
              </div>

              {/* Duration Selector */}
              <div className="bg-[#0a0c1c]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold tracking-widest text-white/50">
                    SET DURATION
                  </span>
                  <span className="text-sm font-bold text-white">
                    {duration} MINS
                  </span>
                </div>
                <div className="flex gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={cn(
                        'flex-1 py-2 rounded-lg text-sm font-bold transition-all',
                        duration === d
                          ? 'bg-white text-black'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Step 2 */}
          <div className="space-y-6">
            {/* Step 2 Card */}
            <div className="bg-[#0a0c1c]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="inline-block px-3 py-1 rounded bg-white/10 border border-white/20 mb-3">
                    <span className="text-xs font-bold tracking-widest text-white/80">
                      STEP 2: ARC TEMPLATE
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-white">
                    CHOOSE YOUR
                  </h2>
                  <h2 className="text-2xl font-black text-cyan-400">
                    ENERGY
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/50 mb-1">TARGET</p>
                  <p className="text-xs font-bold tracking-widest text-white/50">RANGE</p>
                  <p className="text-lg font-bold">
                    <span className="text-cyan-400">{bpmRange.min}</span>
                    <span className="text-white/50"> — </span>
                    <span className="text-cyan-400">{bpmRange.max}</span>
                    <span className="text-white/50 text-sm ml-1">BPM</span>
                  </p>
                </div>
              </div>

              {/* Arc Templates */}
              <div className="space-y-3 mb-6">
                {ARC_TEMPLATES.map((arc) => (
                  <button
                    key={arc.id}
                    onClick={() => setSelectedArc(arc.id)}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200',
                      'border',
                      selectedArc === arc.id
                        ? 'bg-cyan-500/10 border-cyan-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    )}
                  >
                    {/* Arc Visualization */}
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
                      <p className="text-xs text-white/50">{arc.description}</p>
                    </div>
                    {selectedArc === arc.id && (
                      <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-black" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Generate Button */}
              <motion.button
                onClick={handleGenerate}
                disabled={isGenerating}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'w-full py-4 rounded-xl font-black text-lg tracking-wider',
                  'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black',
                  'shadow-[0_0_30px_rgba(0,242,255,0.3)]',
                  'hover:shadow-[0_0_40px_rgba(0,242,255,0.5)]',
                  'transition-all duration-300',
                  'flex items-center justify-center gap-3',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
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
                    GENERATE MY SET
                  </>
                )}
              </motion.button>

              <p className="text-center text-xs text-white/40 mt-3">
                <Clock className="w-3 h-3 inline mr-1" />
                ESTIMATED BUILD TIME: {'<'} 8 SECONDS
              </p>
            </div>

            {/* Trending Section */}
            <div className="bg-[#0a0c1c]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
              <h3 className="text-xs font-bold tracking-widest text-white/50 mb-4">
                TRENDING IN YOUR NETWORK
              </h3>
              <div className="space-y-3">
                {TRENDING_SETS.map((set, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/50 to-purple-500/50" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{set.name}</p>
                      <p className="text-xs text-white/50">
                        Generated by {set.author} • {set.time}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-white/50">
                      <Heart className="w-3 h-3" />
                      <span className="text-xs">{set.likes}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
