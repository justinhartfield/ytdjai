'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import type { SegmentPreset } from '@/types'
import { SEGMENT_PRESETS } from '@/types'

interface SegmentPresetPickerProps {
  onSelect?: (preset: SegmentPreset) => void
  className?: string
}

// Visual representations for energy curve hints
const CURVE_PREVIEWS: Record<string, string> = {
  ascending: 'M0,20 Q25,15 50,10 Q75,5 100,0',
  descending: 'M0,0 Q25,5 50,10 Q75,15 100,20',
  peak: 'M0,15 Q25,5 50,0 Q75,5 100,15',
  steady: 'M0,10 L100,10',
  dip: 'M0,5 Q25,15 50,20 Q75,15 100,5',
}

export function SegmentPresetPicker({ onSelect, className }: SegmentPresetPickerProps) {
  const { addSegment } = useYTDJStore()

  const handleSelect = (preset: SegmentPreset) => {
    const config = SEGMENT_PRESETS[preset]
    const newSegment = {
      id: `segment-${Date.now()}-${preset}`,
      name: config.name,
      color: config.suggestedColor,
      duration: config.defaultDuration,
      order: 0, // Will be recalculated when added
      constraints: config.defaultConstraints,
    }
    addSegment(newSegment)
    onSelect?.(preset)
  }

  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      {(Object.keys(SEGMENT_PRESETS) as SegmentPreset[]).map((preset) => {
        const config = SEGMENT_PRESETS[preset]
        const curvePath = CURVE_PREVIEWS[config.energyCurveHint] || CURVE_PREVIEWS.steady

        return (
          <button
            key={preset}
            onClick={() => handleSelect(preset)}
            className={cn(
              'flex flex-col items-start p-3 rounded-lg transition-all',
              'bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600',
              'group'
            )}
          >
            {/* Header with color dot and name */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: config.suggestedColor }}
              />
              <span className="text-sm font-medium text-zinc-200">
                {config.name}
              </span>
            </div>

            {/* Energy curve preview */}
            <div className="w-full h-5 mb-2">
              <svg
                viewBox="0 0 100 20"
                className="w-full h-full"
                preserveAspectRatio="none"
              >
                <path
                  d={curvePath}
                  fill="none"
                  stroke={config.suggestedColor}
                  strokeWidth="2"
                  className="opacity-50 group-hover:opacity-80 transition-opacity"
                />
              </svg>
            </div>

            {/* Duration and energy range */}
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <span>
                {config.defaultDuration.type === 'tracks'
                  ? `${config.defaultDuration.count} tracks`
                  : `${config.defaultDuration.duration} min`}
              </span>
              {config.defaultConstraints.energyRange && (
                <>
                  <span>·</span>
                  <span>
                    {config.defaultConstraints.energyRange.min}-
                    {config.defaultConstraints.energyRange.max}
                  </span>
                </>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// Compact version for adding a single segment inline
export function AddSegmentButton({
  onAdd,
  className
}: {
  onAdd?: () => void
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const { addSegment } = useYTDJStore()

  const handleSelect = (preset: SegmentPreset) => {
    const config = SEGMENT_PRESETS[preset]
    const newSegment = {
      id: `segment-${Date.now()}-${preset}`,
      name: config.name,
      color: config.suggestedColor,
      duration: config.defaultDuration,
      order: 0,
      constraints: config.defaultConstraints,
    }
    addSegment(newSegment)
    setIsOpen(false)
    onAdd?.()
  }

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
          'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
        )}
      >
        + Add Segment
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 z-50 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
            {(Object.keys(SEGMENT_PRESETS) as SegmentPreset[]).map((preset) => {
              const config = SEGMENT_PRESETS[preset]
              return (
                <button
                  key={preset}
                  onClick={() => handleSelect(preset)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                    'hover:bg-zinc-800 text-zinc-300'
                  )}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: config.suggestedColor }}
                  />
                  <span className="text-sm">{config.name}</span>
                  <span className="text-xs text-zinc-500 ml-auto">
                    {config.defaultDuration.type === 'tracks'
                      ? `${config.defaultDuration.count}t`
                      : `${config.defaultDuration.duration}m`}
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

