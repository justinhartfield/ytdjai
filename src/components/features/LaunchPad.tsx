'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Sparkles, Check, Heart, Clock, Settings, ChevronDown, ChevronUp, Sliders,
  Sun, Moon, Cloud, Snowflake, CloudRain, CloudLightning,
  Dumbbell, BookOpen, Briefcase, UtensilsCrossed, Car, Sofa, Music2,
  User, Users, PartyPopper, Radio, Sunrise, Sunset, Leaf, Flower2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { generatePlaylist } from '@/lib/ai-service'
import { streamGeneratePlaylist } from '@/lib/ai-stream-service'
import type { AIConstraints } from '@/types'
import { AIConstraintsDrawer } from './AIConstraintsDrawer'
import { AIWizardPro } from './AIWizardPro'
import { UpgradeModal } from './Subscription/UpgradeModal'
import type { StreamError } from '@/lib/ai-stream-service'

// Context token options from the wizard - shown on homepage with truncation
const CONTEXT_TOKEN_OPTIONS = {
  timeOfDay: [
    { id: 'morning', label: 'Morning', icon: Sunrise },
    { id: 'afternoon', label: 'Afternoon', icon: Sun },
    { id: 'evening', label: 'Evening', icon: Sunset },
    { id: 'night', label: 'Night', icon: Moon },
    { id: 'late-night', label: 'Late Night', icon: Sparkles }
  ],
  season: [
    { id: 'spring', label: 'Spring', icon: Flower2 },
    { id: 'summer', label: 'Summer', icon: Sun },
    { id: 'fall', label: 'Fall', icon: Leaf },
    { id: 'winter', label: 'Winter', icon: Snowflake }
  ],
  weather: [
    { id: 'sunny', label: 'Sunny', icon: Sun },
    { id: 'cloudy', label: 'Cloudy', icon: Cloud },
    { id: 'rainy', label: 'Rainy', icon: CloudRain },
    { id: 'stormy', label: 'Stormy', icon: CloudLightning },
    { id: 'snowy', label: 'Snowy', icon: Snowflake }
  ],
  activity: [
    { id: 'workout', label: 'Workout', icon: Dumbbell },
    { id: 'study', label: 'Study', icon: BookOpen },
    { id: 'work', label: 'Work', icon: Briefcase },
    { id: 'dinner-party', label: 'Dinner Party', icon: UtensilsCrossed },
    { id: 'driving', label: 'Driving', icon: Car },
    { id: 'relaxing', label: 'Relaxing', icon: Sofa },
    { id: 'dancing', label: 'Dancing', icon: Music2 }
  ],
  socialContext: [
    { id: 'solo', label: 'Solo', icon: User },
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'date', label: 'Date', icon: Heart },
    { id: 'party', label: 'Party', icon: PartyPopper },
    { id: 'background', label: 'Background', icon: Radio }
  ]
}

// How many tokens to show before "More Settings" in each category
const VISIBLE_TOKEN_COUNTS = {
  timeOfDay: 3,
  activity: 4,
  socialContext: 3
}

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
  const [novelty, setNovelty] = useState(50)
  const [duration, setDuration] = useState(45)
  const [selectedArc, setSelectedArc] = useState('mountain')
  const [energyRange, setEnergyRange] = useState({ min: 20, max: 80 })
  const [isGenerating, setIsGenerating] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [showAllTokens, setShowAllTokens] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

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
    updatePrompt,
    setContextToken,
    clearContextToken,
    setGenerationError
  } = useYTDJStore()

  const { contextTokens } = generationControls

  // Toggle context token
  const toggleContextToken = (category: keyof typeof CONTEXT_TOKEN_OPTIONS, id: string) => {
    if (contextTokens[category] === id) {
      clearContextToken(category)
    } else {
      setContextToken(category, id as never)
    }
  }

  // Get active context summary text
  const getContextSummary = () => {
    const parts: string[] = []
    if (contextTokens.timeOfDay) parts.push(contextTokens.timeOfDay)
    if (contextTokens.activity) parts.push(contextTokens.activity)
    if (contextTokens.socialContext) parts.push(contextTokens.socialContext)
    if (contextTokens.season) parts.push(contextTokens.season)
    if (contextTokens.weather) parts.push(contextTokens.weather)
    return parts.join(' / ')
  }

  const getNoveltyLabel = () => {
    if (novelty < 33) return 'Familiar'
    if (novelty < 66) return 'Balanced'
    return 'Adventurous'
  }

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    setStoreGenerating(true)

    // Build display text for weighted phrases (used in prompt display)
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

    // Build a clean, focused prompt that shows what the user actually configured
    // This is for display purposes - the actual generation uses the constraints object
    const buildCleanPrompt = (): string => {
      const parts: string[] = []

      // Primary vibe definition - prioritize weighted phrases > user prompt > tags
      if (weightedPhrasesText) {
        parts.push(weightedPhrasesText)
      } else if (prompt.trim()) {
        parts.push(prompt.trim())
      }

      // Add long-form inspiration if provided (truncated for display only)
      if (generationControls.longFormInput) {
        const truncated = generationControls.longFormInput.substring(0, 150)
        parts.push(`Inspired by: "${truncated}${generationControls.longFormInput.length > 150 ? '...' : ''}"`)
      }

      // Add context tokens summary
      const contextParts: string[] = []
      if (generationControls.contextTokens.activity) contextParts.push(generationControls.contextTokens.activity)
      if (generationControls.contextTokens.timeOfDay) contextParts.push(generationControls.contextTokens.timeOfDay)
      if (generationControls.contextTokens.socialContext) contextParts.push(generationControls.contextTokens.socialContext)
      if (contextParts.length > 0) {
        parts.push(`Context: ${contextParts.join(', ')}`)
      }

      // Add anchor tracks
      if (generationControls.anchorTracks.length > 0) {
        const anchorNames = generationControls.anchorTracks.map(t => `"${t.title}"`).join(', ')
        parts.push(`Must include: ${anchorNames}`)
      }

      // Add vocal preferences summary
      const vocalParts: string[] = []
      if (generationControls.vocalDensity.instrumentalVsVocal < 30) vocalParts.push('instrumental')
      else if (generationControls.vocalDensity.instrumentalVsVocal > 70) vocalParts.push('vocal-heavy')
      if (generationControls.vocalDensity.hookyVsAtmospheric > 70) vocalParts.push('atmospheric')
      if (vocalParts.length > 0) {
        parts.push(`Vocals: ${vocalParts.join(', ')}`)
      }

      // Add energy preset
      if (generationControls.energyPreset && generationControls.energyPreset !== 'custom') {
        const presetLabels: Record<string, string> = {
          'no-slow-songs': 'No slow songs',
          'keep-it-mellow': 'Keep it mellow',
          'mid-tempo-groove': 'Mid-tempo groove',
          'bpm-ramp': 'BPM ramp up'
        }
        parts.push(`Energy: ${presetLabels[generationControls.energyPreset] || generationControls.energyPreset}`)
      }

      // Add content mode
      if (generationControls.contentMode && generationControls.contentMode !== 'explicit-ok') {
        parts.push(generationControls.contentMode === 'clean' ? 'Clean only' : 'Family-friendly')
      }

      // Add avoid concepts
      if (generationControls.avoidConcepts.length > 0) {
        parts.push(`Avoid: ${generationControls.avoidConcepts.slice(0, 3).join(', ')}${generationControls.avoidConcepts.length > 3 ? '...' : ''}`)
      }

      // If still empty, use a minimal default
      if (parts.length === 0) {
        return 'Generate a DJ set'
      }

      return parts.join(' · ')
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
        onError: (error: string, details?: StreamError) => {
          console.error('[Stream] Error:', error, details)
          setIsGenerating(false)
          setStoreGenerating(false)
          // Set generation error in store so ArrangementIDE can show upgrade modal
          if (details?.code) {
            setGenerationError({
              message: error,
              code: details.code,
              tier: details.tier
            })
          }
        }
      }
    )
  }, [
    prompt, selectedArc, duration, energyRange, novelty,
    aiProvider, constraints, generationControls,
    updatePrompt, startParallelGeneration, onComplete,
    receivePrimaryResult, receiveAlternativeResult, setProviderFailed,
    enrichTrack, completeGeneration, failAllGeneration, setStoreGenerating,
    setGenerationError
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

      {/* Upgrade Modal - shown when out of credits */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="AI Generation Credits"
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

              {/* Context Tokens - Truncated version from Wizard */}
              <div className="mt-6 space-y-4">
                {/* Header with expand button */}
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold tracking-widest text-white/40 uppercase">
                    When & Where Will You Listen?
                  </h4>
                  <button
                    onClick={() => setShowAllTokens(!showAllTokens)}
                    className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    {showAllTokens ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        Less
                      </>
                    ) : (
                      <>
                        <Settings className="w-3 h-3" />
                        More Settings
                      </>
                    )}
                  </button>
                </div>

                {/* Time of Day - Always show first 3 */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider flex items-center gap-1.5">
                    <Sun className="w-3 h-3" />
                    Time of Day
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CONTEXT_TOKEN_OPTIONS.timeOfDay
                      .slice(0, showAllTokens ? undefined : VISIBLE_TOKEN_COUNTS.timeOfDay)
                      .map((option) => {
                        const Icon = option.icon
                        return (
                          <button
                            key={option.id}
                            onClick={() => toggleContextToken('timeOfDay', option.id)}
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border',
                              contextTokens.timeOfDay === option.id
                                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                            )}
                          >
                            <Icon className="w-3 h-3" />
                            {option.label}
                          </button>
                        )
                      })}
                    {!showAllTokens && CONTEXT_TOKEN_OPTIONS.timeOfDay.length > VISIBLE_TOKEN_COUNTS.timeOfDay && (
                      <span className="text-[10px] text-white/30 self-center">
                        +{CONTEXT_TOKEN_OPTIONS.timeOfDay.length - VISIBLE_TOKEN_COUNTS.timeOfDay} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Activity - Always show first 4 */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider flex items-center gap-1.5">
                    <Dumbbell className="w-3 h-3" />
                    Activity
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CONTEXT_TOKEN_OPTIONS.activity
                      .slice(0, showAllTokens ? undefined : VISIBLE_TOKEN_COUNTS.activity)
                      .map((option) => {
                        const Icon = option.icon
                        return (
                          <button
                            key={option.id}
                            onClick={() => toggleContextToken('activity', option.id)}
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border',
                              contextTokens.activity === option.id
                                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                            )}
                          >
                            <Icon className="w-3 h-3" />
                            {option.label}
                          </button>
                        )
                      })}
                    {!showAllTokens && CONTEXT_TOKEN_OPTIONS.activity.length > VISIBLE_TOKEN_COUNTS.activity && (
                      <span className="text-[10px] text-white/30 self-center">
                        +{CONTEXT_TOKEN_OPTIONS.activity.length - VISIBLE_TOKEN_COUNTS.activity} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Social Context - Always show first 3 */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3 h-3" />
                    Social Context
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CONTEXT_TOKEN_OPTIONS.socialContext
                      .slice(0, showAllTokens ? undefined : VISIBLE_TOKEN_COUNTS.socialContext)
                      .map((option) => {
                        const Icon = option.icon
                        return (
                          <button
                            key={option.id}
                            onClick={() => toggleContextToken('socialContext', option.id)}
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border',
                              contextTokens.socialContext === option.id
                                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                            )}
                          >
                            <Icon className="w-3 h-3" />
                            {option.label}
                          </button>
                        )
                      })}
                    {!showAllTokens && CONTEXT_TOKEN_OPTIONS.socialContext.length > VISIBLE_TOKEN_COUNTS.socialContext && (
                      <span className="text-[10px] text-white/30 self-center">
                        +{CONTEXT_TOKEN_OPTIONS.socialContext.length - VISIBLE_TOKEN_COUNTS.socialContext} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Season & Weather - Only show when expanded */}
                <AnimatePresence>
                  {showAllTokens && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4 overflow-hidden"
                    >
                      {/* Season */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider flex items-center gap-1.5">
                          <Leaf className="w-3 h-3" />
                          Season
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {CONTEXT_TOKEN_OPTIONS.season.map((option) => {
                            const Icon = option.icon
                            return (
                              <button
                                key={option.id}
                                onClick={() => toggleContextToken('season', option.id)}
                                className={cn(
                                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border',
                                  contextTokens.season === option.id
                                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                                )}
                              >
                                <Icon className="w-3 h-3" />
                                {option.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Weather */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-wider flex items-center gap-1.5">
                          <Cloud className="w-3 h-3" />
                          Weather
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {CONTEXT_TOKEN_OPTIONS.weather.map((option) => {
                            const Icon = option.icon
                            return (
                              <button
                                key={option.id}
                                onClick={() => toggleContextToken('weather', option.id)}
                                className={cn(
                                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border',
                                  contextTokens.weather === option.id
                                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                    : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                                )}
                              >
                                <Icon className="w-3 h-3" />
                                {option.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Active context summary */}
                {getContextSummary() && (
                  <div className="pt-3 border-t border-white/5">
                    <p className="text-[10px] text-cyan-400">
                      Context: <span className="text-white/60">{getContextSummary()}</span>
                    </p>
                  </div>
                )}
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
