'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Sparkles, Check, Heart, Clock, Settings, ChevronDown, ChevronUp, Sliders } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { generatePlaylist } from '@/lib/ai-service'
import { streamGeneratePlaylist } from '@/lib/ai-stream-service'
import type { AIConstraints } from '@/types'
import { AIConstraintsDrawer } from './AIConstraintsDrawer'
import { AIWizardPro } from './AIWizardPro'

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
  const [energyRange, setEnergyRange] = useState({ min: 20, max: 80 })
  const [isGenerating, setIsGenerating] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showWizard, setShowWizard] = useState(false)

  const {
    aiProvider,
    updateSetWithPrompt,
    setIsGenerating: setStoreGenerating,
    constraints,
    generationControls,
    startParallelGeneration,
    receivePrimaryResult,
    receiveAlternativeResult,
    setProviderFailed,
    enrichTrack,
    completeGeneration,
    failAllGeneration,
    updatePrompt
  } = useYTDJStore()

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

    // Build display text for tags and weighted phrases (used in prompt display)
    const tagsText = selectedTags.length > 0 ? selectedTags.join(', ') : ''
    const weightedPhrasesText = generationControls.weightedPhrases.length > 0
      ? generationControls.weightedPhrases.map(p => {
          const totalWeight = generationControls.weightedPhrases.reduce((sum, wp) => sum + wp.weight, 0)
          const percentage = Math.round((p.weight / totalWeight) * 100)
          return `"${p.phrase}" (${percentage}%)`
        }).join(' + ')
      : ''

    // Calculate track count based on length target
    let trackCount: number
    if (generationControls.lengthTarget.type === 'tracks') {
      trackCount = generationControls.lengthTarget.count
    } else {
      trackCount = Math.round(generationControls.lengthTarget.minutes / 4) // Roughly 4 min per track
    }

    // Use the legacy duration-based count if no advanced controls used
    const effectiveTrackCount = generationControls.lengthTarget ? trackCount : Math.round(duration / 5)

    // Build a clean, focused prompt based on what the user actually specified
    // All other settings (context, vocal, energy, etc.) are passed via constraints to the backend
    const buildCleanPrompt = (): string => {
      const parts: string[] = []

      // Primary vibe definition - prioritize weighted phrases > user prompt > tags
      if (weightedPhrasesText) {
        parts.push(weightedPhrasesText)
      } else if (prompt.trim()) {
        parts.push(prompt.trim())
      }

      // Add style tags if selected (and not redundant with user prompt)
      if (tagsText && !parts.some(p => p === tagsText)) {
        parts.push(tagsText)
      }

      // Add long-form inspiration if provided (truncated for display only)
      if (generationControls.longFormInput) {
        const truncated = generationControls.longFormInput.substring(0, 200)
        parts.push(`Inspired by: "${truncated}${generationControls.longFormInput.length > 200 ? '...' : ''}"`)
      }

      // If still empty, use a minimal default
      if (parts.length === 0) {
        return 'Generate a DJ set'
      }

      return parts.join('. ')
    }

    const fullPrompt = buildCleanPrompt()

    // Save the prompt
    updatePrompt(fullPrompt)

    // Start parallel generation - fires all 3 AIs simultaneously
    startParallelGeneration(effectiveTrackCount)

    // Immediately transition to IDE (shows ghost tracks while loading)
    onComplete()

    // Stream results from all 3 providers
    streamGeneratePlaylist(
      {
        prompt: fullPrompt,
        trackCount: effectiveTrackCount,
        energyRange,
        constraints: {
          trackCount: effectiveTrackCount,
          energyRange,
          novelty,
          energyTolerance: constraints.energyTolerance,
          syncopation: constraints.syncopation,
          keyMatch: constraints.keyMatch,
          artistDiversity: constraints.diversity,
          discovery: constraints.discovery,
          activeDecades: constraints.activeDecades,
          blacklist: constraints.blacklist,
          weightedPhrases: generationControls.weightedPhrases,
          avoidConcepts: generationControls.avoidConcepts,
          lengthTarget: generationControls.lengthTarget,
          energyPreset: generationControls.energyPreset,
          contentMode: generationControls.contentMode,
          vocalDensity: generationControls.vocalDensity,
          anchorTracks: generationControls.anchorTracks,
          similarPlaylist: generationControls.similarPlaylist || undefined,
          contextTokens: generationControls.contextTokens,
          longFormInput: generationControls.longFormInput,
          appliedTemplates: generationControls.appliedTemplates
        } as AIConstraints
      },
      {
        onStarted: (providers) => {
          console.log('[Stream] Started with providers:', providers)
        },
        onProviderStarted: (provider) => {
          console.log('[Stream] Provider started:', provider)
        },
        onPrimaryResult: (provider, tracks) => {
          console.log('[Stream] Primary result from:', provider, tracks.length, 'tracks')
          receivePrimaryResult(provider, tracks)
        },
        onAlternativeResult: (provider, tracks) => {
          console.log('[Stream] Alternative result from:', provider, tracks.length, 'tracks')
          receiveAlternativeResult(provider, tracks)
        },
        onProviderFailed: (provider, error) => {
          console.log('[Stream] Provider failed:', provider, error)
          setProviderFailed(provider, error)
        },
        onTrackEnriched: (provider, index, track) => {
          console.log('[Stream] Track enriched:', provider, index, track.title)
          enrichTrack(provider, index, track)
        },
        onComplete: (summary) => {
          console.log('[Stream] Complete:', summary)
          completeGeneration(summary)
          setIsGenerating(false)
          setStoreGenerating(false)
        },
        onAllFailed: (errors) => {
          console.error('[Stream] All providers failed:', errors)
          failAllGeneration(errors)
          setIsGenerating(false)
          setStoreGenerating(false)
        },
        onError: (error) => {
          console.error('[Stream] Error:', error)
          setIsGenerating(false)
          setStoreGenerating(false)
        }
      }
    )
  }, [
    prompt, selectedTags, selectedArc, duration, energyRange, novelty,
    aiProvider, constraints, generationControls,
    updatePrompt, startParallelGeneration, onComplete,
    receivePrimaryResult, receiveAlternativeResult, setProviderFailed,
    enrichTrack, completeGeneration, failAllGeneration, setStoreGenerating
  ])

  return (
    <div className="min-h-screen bg-[#05060f] text-white overflow-auto">
      {/* AI Settings Drawer */}
      <AIConstraintsDrawer
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onRegenerate={() => {
          setShowSettings(false)
          handleGenerate()
        }}
      />

      {/* AI Wizard Pro Modal */}
      <AIWizardPro
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onGenerate={handleGenerate}
      />

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
            <div className="space-y-2 relative">
              {/* Settings Gear Icon */}
              <button
                onClick={() => setShowSettings(true)}
                className="absolute -right-2 top-0 w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/30 flex items-center justify-center transition-all group"
                title="AI Settings"
              >
                <Settings className="w-5 h-5 text-white/50 group-hover:text-cyan-400 transition-colors" />
              </button>
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

            {/* AI Wizard Pro Button */}
            <motion.button
              onClick={() => setShowWizard(true)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={cn(
                'w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all',
                'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30',
                'hover:from-purple-500/20 hover:to-pink-500/20 hover:border-purple-500/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                    AI WIZARD PRO
                  </h3>
                  <p className="text-[10px] text-white/50">
                    Advanced customization in guided steps
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(generationControls.weightedPhrases.length > 0 ||
                  generationControls.avoidConcepts.length > 0 ||
                  generationControls.anchorTracks.length > 0 ||
                  generationControls.appliedTemplates.length > 0 ||
                  Object.keys(generationControls.contextTokens).length > 0 ||
                  generationControls.similarPlaylist?.url ||
                  generationControls.longFormInput) && (
                  <span className="text-[10px] font-bold text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full">
                    ACTIVE
                  </span>
                )}
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Sliders className="w-4 h-4 text-purple-400" />
                </div>
              </div>
            </motion.button>
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
                  <p className="text-xs font-bold tracking-widest text-white/50">ENERGY</p>
                  <p className="text-lg font-bold">
                    <span className="text-cyan-400">{energyRange.min}</span>
                    <span className="text-white/50"> — </span>
                    <span className="text-cyan-400">{energyRange.max}</span>
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

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600">
              &copy; {new Date().getFullYear()} YTDJ.AI. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-xs text-gray-600">
              <Link href="/privacy" className="hover:text-cyan-400 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-cyan-400 transition-colors">Terms of Service</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
