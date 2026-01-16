'use client'

import { useState, useCallback } from 'react'
import { Shuffle, AlertTriangle, CheckCircle, Music2, Zap, Clock, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { useAutoMix } from '@/hooks/useAutoMix'
import { getCompatibilityColor } from '@/lib/camelot'
import { batchEstimateBpmKey } from '@/lib/bpm-key-estimation'

/**
 * AutoMix Panel Component
 *
 * Displays AutoMix controls:
 * - Enable/disable toggle
 * - Mode selection (seamless crossfade vs gapped)
 * - Crossfade duration slider
 * - Transition quality summary
 * - BPM/Key estimation trigger
 */
export function AutoMixPanel() {
  const {
    autoMix,
    setAutoMixEnabled,
    setAutoMixMode,
    setAutoMixCrossfadeDuration,
    batchEnrichBpmKey,
    currentSet,
  } = useYTDJStore()

  const {
    transitionAnalyses,
    transitionSummary,
    problemTransitions,
    tracksNeedingEstimation,
  } = useAutoMix()

  const [isEstimating, setIsEstimating] = useState(false)
  const playlist = currentSet?.playlist || []

  // Handle BPM/Key estimation
  const handleEstimateBpmKey = useCallback(async () => {
    if (tracksNeedingEstimation.length === 0) return

    setIsEstimating(true)
    try {
      const result = await batchEstimateBpmKey(tracksNeedingEstimation)

      if (result.success && result.estimates) {
        const updates: Array<{ nodeIndex: number; bpm: number; key: string; camelotCode?: string }> =
          []

        result.estimates.forEach((estimate, index) => {
          updates.push({
            nodeIndex: index,
            bpm: estimate.bpm,
            key: estimate.key,
            camelotCode: estimate.camelotCode || undefined,
          })
        })

        if (updates.length > 0) {
          batchEnrichBpmKey(updates)
        }
      }
    } catch (error) {
      console.error('[AutoMix] BPM/Key estimation failed:', error)
    } finally {
      setIsEstimating(false)
    }
  }, [tracksNeedingEstimation, batchEnrichBpmKey])

  if (playlist.length === 0) {
    return null
  }

  return (
    <div className="border-b border-white/5 pb-4 mb-4">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shuffle className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">AutoMix</span>
          {autoMix.enabled && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-cyan-500/20 text-cyan-400 rounded">
              ON
            </span>
          )}
        </div>

        {/* Toggle Switch */}
        <button
          onClick={() => setAutoMixEnabled(!autoMix.enabled)}
          className={cn(
            'w-11 h-6 rounded-full transition-all relative',
            autoMix.enabled ? 'bg-cyan-500' : 'bg-white/10'
          )}
        >
          <div
            className={cn(
              'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow-sm',
              autoMix.enabled ? 'left-[22px]' : 'left-0.5'
            )}
          />
        </button>
      </div>

      {autoMix.enabled && (
        <div className="space-y-4">
          {/* Mode Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setAutoMixMode('seamless')}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
                autoMix.mode === 'seamless'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-white/5 text-gray-400 border border-white/5 hover:border-white/10'
              )}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Zap className="w-3 h-3" />
                <span>Crossfade</span>
              </div>
            </button>
            <button
              onClick={() => setAutoMixMode('gapped')}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
                autoMix.mode === 'gapped'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-white/5 text-gray-400 border border-white/5 hover:border-white/10'
              )}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span>Gapped</span>
              </div>
            </button>
          </div>

          {/* Crossfade Duration Slider (only for seamless mode) */}
          {autoMix.mode === 'seamless' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Crossfade
                </span>
                <span className="text-xs font-mono text-cyan-400">
                  {autoMix.crossfadeDuration}s
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="1"
                value={autoMix.crossfadeDuration}
                onChange={(e) => setAutoMixCrossfadeDuration(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none
                         [&::-webkit-slider-thumb]:w-3
                         [&::-webkit-slider-thumb]:h-3
                         [&::-webkit-slider-thumb]:rounded-full
                         [&::-webkit-slider-thumb]:bg-cyan-400
                         [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(34,211,238,0.5)]
                         [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-gray-600">
                <span>5s</span>
                <span>30s</span>
              </div>
            </div>
          )}

          {/* Transition Quality Summary */}
          <div className="bg-white/5 rounded-xl p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Transitions
              </span>
              {transitionSummary.total === 0 ? (
                <span className="text-[10px] text-gray-500">No tracks</span>
              ) : !transitionSummary.hasIssues ? (
                <div className="flex items-center gap-1 text-green-400">
                  <CheckCircle className="w-3 h-3" />
                  <span className="text-[10px] font-bold">All Good</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-orange-400">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-[10px] font-bold">
                    {problemTransitions.length} Warning{problemTransitions.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Transition Quality Bars */}
            {transitionAnalyses.length > 0 && (
              <div className="flex gap-0.5">
                {transitionAnalyses.map((analysis, i) => (
                  <div
                    key={i}
                    className="flex-1 h-2 rounded-full transition-all hover:scale-y-150"
                    style={{ backgroundColor: getCompatibilityColor(analysis.keyCompatibility) }}
                    title={`${analysis.fromTrack.title} → ${analysis.toTrack.title}: ${analysis.keyCompatibility} (${analysis.overallScore}%)`}
                  />
                ))}
              </div>
            )}

            {/* Score */}
            {transitionSummary.total > 0 && (
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-500">Average Score</span>
                <span
                  className={cn(
                    'font-bold',
                    transitionSummary.averageScore >= 70
                      ? 'text-green-400'
                      : transitionSummary.averageScore >= 50
                      ? 'text-yellow-400'
                      : 'text-red-400'
                  )}
                >
                  {transitionSummary.averageScore}%
                </span>
              </div>
            )}
          </div>

          {/* BPM/Key Estimation */}
          {tracksNeedingEstimation.length > 0 && (
            <button
              onClick={handleEstimateBpmKey}
              disabled={isEstimating}
              className={cn(
                'w-full py-2.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
                'bg-purple-500/20 text-purple-400 border border-purple-500/30',
                'hover:bg-purple-500/30 hover:border-purple-500/40',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <div className="flex items-center justify-center gap-2">
                {isEstimating ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Music2 className="w-3 h-3" />
                )}
                <span>
                  {isEstimating
                    ? 'Analyzing...'
                    : `Estimate BPM/Key (${tracksNeedingEstimation.length} tracks)`}
                </span>
              </div>
            </button>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-2 text-[9px]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#00ff88]" />
              <span className="text-gray-500">Perfect</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#00f2ff]" />
              <span className="text-gray-500">Compatible</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#ffaa00]" />
              <span className="text-gray-500">Warning</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#ff4444]" />
              <span className="text-gray-500">Clash</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
