'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { getKeyCompatibility, getCompatibilityColor, getCompatibilityDescription } from '@/lib/camelot'
import type { Track, KeyCompatibility } from '@/types'

interface TransitionIndicatorProps {
  fromTrack: Track
  toTrack: Track
  showDetails?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Visual indicator for transition quality between two tracks
 *
 * Shows:
 * - Color-coded compatibility (green/cyan/yellow/red)
 * - Hover tooltip with details (key match, BPM difference)
 */
export function TransitionIndicator({
  fromTrack,
  toTrack,
  showDetails = true,
  size = 'md',
  className,
}: TransitionIndicatorProps) {
  const [isHovered, setIsHovered] = useState(false)

  const keyCompat = getKeyCompatibility(fromTrack.key, toTrack.key)
  const color = getCompatibilityColor(keyCompat)
  const description = getCompatibilityDescription(keyCompat)

  const bpmDiff =
    fromTrack.bpm && toTrack.bpm ? Math.abs(fromTrack.bpm - toTrack.bpm) : null

  const sizeClasses = {
    sm: 'w-4 h-1',
    md: 'w-8 h-1.5',
    lg: 'w-12 h-2',
  }

  return (
    <div
      className={cn('relative group', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Connection Line/Dot */}
      <div
        className={cn(
          'rounded-full transition-all duration-200',
          sizeClasses[size],
          isHovered && 'scale-y-150'
        )}
        style={{ backgroundColor: color }}
      />

      {/* Hover Tooltip */}
      {showDetails && isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-black/95 border border-white/10 rounded-lg p-3 min-w-[180px] shadow-xl">
            <div className="text-[10px] font-bold text-white uppercase mb-2">
              Transition Quality
            </div>

            <div className="space-y-2">
              {/* Key Compatibility */}
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-gray-500 uppercase">Key Match</span>
                <span
                  className="text-[10px] font-bold uppercase"
                  style={{ color }}
                >
                  {keyCompat}
                </span>
              </div>

              {/* Keys Display */}
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-gray-500 uppercase">Keys</span>
                <span className="text-[10px] text-white font-mono">
                  {fromTrack.key || '?'} → {toTrack.key || '?'}
                </span>
              </div>

              {/* Camelot Codes (if available) */}
              {(fromTrack.camelotCode || toTrack.camelotCode) && (
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-gray-500 uppercase">Camelot</span>
                  <span className="text-[10px] text-cyan-400 font-mono">
                    {fromTrack.camelotCode || '?'} → {toTrack.camelotCode || '?'}
                  </span>
                </div>
              )}

              {/* BPM Difference */}
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-gray-500 uppercase">BPM Diff</span>
                {bpmDiff !== null ? (
                  <span
                    className={cn(
                      'text-[10px] font-bold',
                      bpmDiff <= 3
                        ? 'text-green-400'
                        : bpmDiff <= 8
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    )}
                  >
                    ±{bpmDiff.toFixed(0)}
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-500">N/A</span>
                )}
              </div>

              {/* BPMs Display */}
              {(fromTrack.bpm || toTrack.bpm) && (
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-gray-500 uppercase">BPMs</span>
                  <span className="text-[10px] text-white font-mono">
                    {fromTrack.bpm || '?'} → {toTrack.bpm || '?'}
                  </span>
                </div>
              )}

              {/* Description */}
              <div className="pt-1 border-t border-white/5">
                <span className="text-[9px] text-gray-400">{description}</span>
              </div>
            </div>

            {/* Arrow pointer */}
            <div
              className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0
                         border-l-[6px] border-l-transparent
                         border-r-[6px] border-r-transparent
                         border-t-[6px] border-t-black/95"
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact dot indicator for use in tight spaces
 */
export function TransitionDot({
  fromTrack,
  toTrack,
  className,
}: {
  fromTrack: Track
  toTrack: Track
  className?: string
}) {
  const keyCompat = getKeyCompatibility(fromTrack.key, toTrack.key)
  const color = getCompatibilityColor(keyCompat)

  return (
    <div
      className={cn('w-2 h-2 rounded-full', className)}
      style={{ backgroundColor: color }}
      title={`${fromTrack.title} → ${toTrack.title}: ${keyCompat}`}
    />
  )
}

/**
 * Inline badge showing key compatibility
 */
export function KeyCompatibilityBadge({
  compatibility,
  className,
}: {
  compatibility: KeyCompatibility
  className?: string
}) {
  const color = getCompatibilityColor(compatibility)

  return (
    <span
      className={cn(
        'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase',
        className
      )}
      style={{
        backgroundColor: `${color}20`,
        color: color,
      }}
    >
      {compatibility}
    </span>
  )
}
