'use client'

import { useState, useCallback } from 'react'
import {
  X,
  RefreshCw,
  Clock,
  Music2,
  Zap,
  Tag,
  Calendar,
  Ban,
  Lock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Palette
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import type { SetSegment, SegmentPreset, Mood } from '@/types'
import { SEGMENT_PRESETS } from '@/types'

interface SegmentEditorProps {
  segmentId: string
  onClose: () => void
  onRegenerate?: (segmentId: string) => void
  className?: string
}

const MOODS: Mood[] = ['energetic', 'chill', 'dark', 'uplifting', 'melancholic', 'aggressive', 'romantic', 'psychedelic']
const DECADES = ['70s', '80s', '90s', '00s', '10s', '20s']
const PRESET_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#6B7280']

export function SegmentEditor({ segmentId, onClose, onRegenerate, className }: SegmentEditorProps) {
  const { segments, updateSegment, applySegmentPreset, isRegeneratingSegment } = useYTDJStore()
  const segment = segments.find((s) => s.id === segmentId)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    duration: true,
    energy: true,
    genres: false,
    decades: false,
    content: false,
    prompt: false,
  })

  const isRegenerating = isRegeneratingSegment === segmentId

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const handleUpdate = useCallback(
    (updates: Partial<SetSegment>) => {
      updateSegment(segmentId, updates)
    },
    [segmentId, updateSegment]
  )

  const handleConstraintUpdate = useCallback(
    (key: keyof SetSegment['constraints'], value: any) => {
      if (!segment) return
      updateSegment(segmentId, {
        constraints: { ...segment.constraints, [key]: value }
      })
    },
    [segmentId, segment, updateSegment]
  )

  if (!segment) {
    return null
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-zinc-900 border-l border-zinc-800',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: segment.color }}
          />
          <h3 className="text-sm font-medium text-zinc-200">Edit Segment</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Segment Name */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Segment Name
            </label>
            <input
              type="text"
              value={segment.name}
              onChange={(e) => handleUpdate({ name: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="e.g., Warmup, Peak, Land"
            />
          </div>

          {/* Segment Color */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Color
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className={cn(
                    'w-6 h-6 rounded-full transition-transform hover:scale-110',
                    segment.color === color && 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900'
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => handleUpdate({ color })}
                />
              ))}
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Quick Presets
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(SEGMENT_PRESETS) as SegmentPreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() => applySegmentPreset(segmentId, preset)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                    'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  )}
                >
                  {SEGMENT_PRESETS[preset].name}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Section */}
          <CollapsibleSection
            title="Duration"
            icon={<Clock className="w-4 h-4" />}
            expanded={expandedSections.duration}
            onToggle={() => toggleSection('duration')}
          >
            <div className="space-y-3">
              {/* Duration Type Toggle */}
              <div className="flex rounded-lg bg-zinc-800 p-0.5">
                <button
                  className={cn(
                    'flex-1 py-1.5 text-xs font-medium rounded-md transition-colors',
                    segment.duration.type === 'tracks'
                      ? 'bg-zinc-700 text-zinc-200'
                      : 'text-zinc-400 hover:text-zinc-300'
                  )}
                  onClick={() => handleUpdate({ duration: { type: 'tracks', count: 4 } })}
                >
                  Track Count
                </button>
                <button
                  className={cn(
                    'flex-1 py-1.5 text-xs font-medium rounded-md transition-colors',
                    segment.duration.type === 'minutes'
                      ? 'bg-zinc-700 text-zinc-200'
                      : 'text-zinc-400 hover:text-zinc-300'
                  )}
                  onClick={() => handleUpdate({ duration: { type: 'minutes', duration: 15 } })}
                >
                  Minutes
                </button>
              </div>

              {/* Duration Value */}
              {segment.duration.type === 'tracks' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-500">Tracks</span>
                    <span className="text-xs font-medium text-zinc-300">
                      {segment.duration.count}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={segment.duration.count}
                    onChange={(e) =>
                      handleUpdate({ duration: { type: 'tracks', count: parseInt(e.target.value) } })
                    }
                    className="w-full accent-cyan-500"
                  />
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-500">Minutes</span>
                    <span className="text-xs font-medium text-zinc-300">
                      {segment.duration.duration} min
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={5}
                    value={segment.duration.duration}
                    onChange={(e) =>
                      handleUpdate({ duration: { type: 'minutes', duration: parseInt(e.target.value) } })
                    }
                    className="w-full accent-cyan-500"
                  />
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Energy Section */}
          <CollapsibleSection
            title="Energy Range"
            icon={<Zap className="w-4 h-4" />}
            expanded={expandedSections.energy}
            onToggle={() => toggleSection('energy')}
          >
            <div className="space-y-3">
              {/* Min Energy */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-500">Min Energy</span>
                  <span className="text-xs font-medium text-zinc-300">
                    {segment.constraints.energyRange?.min ?? 1}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={segment.constraints.energyRange?.min ?? 1}
                  onChange={(e) =>
                    handleConstraintUpdate('energyRange', {
                      min: parseInt(e.target.value),
                      max: segment.constraints.energyRange?.max ?? 100
                    })
                  }
                  className="w-full accent-cyan-500"
                />
              </div>

              {/* Max Energy */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-500">Max Energy</span>
                  <span className="text-xs font-medium text-zinc-300">
                    {segment.constraints.energyRange?.max ?? 100}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={segment.constraints.energyRange?.max ?? 100}
                  onChange={(e) =>
                    handleConstraintUpdate('energyRange', {
                      min: segment.constraints.energyRange?.min ?? 1,
                      max: parseInt(e.target.value)
                    })
                  }
                  className="w-full accent-cyan-500"
                />
              </div>

              {/* Energy visualization */}
              <div className="h-2 rounded-full bg-zinc-800 relative overflow-hidden">
                <div
                  className="absolute h-full bg-gradient-to-r from-cyan-500 to-pink-500"
                  style={{
                    left: `${segment.constraints.energyRange?.min ?? 0}%`,
                    right: `${100 - (segment.constraints.energyRange?.max ?? 100)}%`
                  }}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Moods/Genres Section */}
          <CollapsibleSection
            title="Moods & Genres"
            icon={<Tag className="w-4 h-4" />}
            expanded={expandedSections.genres}
            onToggle={() => toggleSection('genres')}
          >
            <div className="space-y-3">
              {/* Moods */}
              <div>
                <span className="text-xs text-zinc-500 block mb-1.5">Moods</span>
                <div className="flex flex-wrap gap-1.5">
                  {MOODS.map((mood) => {
                    const isSelected = segment.constraints.moods?.includes(mood)
                    return (
                      <button
                        key={mood}
                        onClick={() => {
                          const currentMoods = segment.constraints.moods || []
                          handleConstraintUpdate(
                            'moods',
                            isSelected
                              ? currentMoods.filter((m) => m !== mood)
                              : [...currentMoods, mood]
                          )
                        }}
                        className={cn(
                          'px-2 py-0.5 rounded text-xs capitalize transition-colors',
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                        )}
                      >
                        {mood}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Preferred Genres Input */}
              <div>
                <span className="text-xs text-zinc-500 block mb-1.5">Preferred Genres</span>
                <input
                  type="text"
                  placeholder="e.g., house, techno, disco"
                  value={segment.constraints.preferredGenres?.join(', ') || ''}
                  onChange={(e) =>
                    handleConstraintUpdate(
                      'preferredGenres',
                      e.target.value.split(',').map((g) => g.trim()).filter(Boolean)
                    )
                  }
                  className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {/* Avoid Genres Input */}
              <div>
                <span className="text-xs text-zinc-500 block mb-1.5">Avoid Genres</span>
                <input
                  type="text"
                  placeholder="e.g., country, metal"
                  value={segment.constraints.avoidGenres?.join(', ') || ''}
                  onChange={(e) =>
                    handleConstraintUpdate(
                      'avoidGenres',
                      e.target.value.split(',').map((g) => g.trim()).filter(Boolean)
                    )
                  }
                  className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Decades Section */}
          <CollapsibleSection
            title="Decades"
            icon={<Calendar className="w-4 h-4" />}
            expanded={expandedSections.decades}
            onToggle={() => toggleSection('decades')}
          >
            <div className="flex flex-wrap gap-1.5">
              {DECADES.map((decade) => {
                const isSelected = segment.constraints.activeDecades?.includes(decade)
                return (
                  <button
                    key={decade}
                    onClick={() => {
                      const current = segment.constraints.activeDecades || []
                      handleConstraintUpdate(
                        'activeDecades',
                        isSelected
                          ? current.filter((d) => d !== decade)
                          : [...current, decade]
                      )
                    }}
                    className={cn(
                      'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                    )}
                  >
                    {decade}
                  </button>
                )
              })}
            </div>
          </CollapsibleSection>

          {/* Content Rules Section */}
          <CollapsibleSection
            title="Content Rules"
            icon={<Ban className="w-4 h-4" />}
            expanded={expandedSections.content}
            onToggle={() => toggleSection('content')}
          >
            <div className="space-y-3">
              {/* Explicit toggle */}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs text-zinc-300">Avoid explicit lyrics</span>
                <button
                  onClick={() =>
                    handleConstraintUpdate('avoidExplicit', !segment.constraints.avoidExplicit)
                  }
                  className={cn(
                    'relative w-9 h-5 rounded-full transition-colors',
                    segment.constraints.avoidExplicit ? 'bg-cyan-500' : 'bg-zinc-700'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                      segment.constraints.avoidExplicit ? 'left-4' : 'left-0.5'
                    )}
                  />
                </button>
              </label>

              {/* Discovery slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-500">Discovery</span>
                  <span className="text-xs text-zinc-300">
                    {segment.constraints.discovery ?? 50}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={segment.constraints.discovery ?? 50}
                  onChange={(e) =>
                    handleConstraintUpdate('discovery', parseInt(e.target.value))
                  }
                  className="w-full accent-cyan-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
                  <span>Hits</span>
                  <span>Deep Cuts</span>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Custom Prompt Section */}
          <CollapsibleSection
            title="Segment Prompt"
            icon={<Sparkles className="w-4 h-4" />}
            expanded={expandedSections.prompt}
            onToggle={() => toggleSection('prompt')}
          >
            <div>
              <textarea
                value={segment.prompt || ''}
                onChange={(e) => handleUpdate({ prompt: e.target.value })}
                placeholder="Add specific instructions for this segment..."
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
                rows={3}
              />
              <p className="text-[10px] text-zinc-600 mt-1">
                This prompt is appended to the main set prompt for this segment only.
              </p>
            </div>
          </CollapsibleSection>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-800">
        <button
          onClick={() => onRegenerate?.(segmentId)}
          disabled={isRegenerating}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
            'bg-gradient-to-r from-cyan-500 to-pink-500 text-white hover:opacity-90',
            isRegenerating && 'opacity-50 cursor-not-allowed'
          )}
        >
          <RefreshCw className={cn('w-4 h-4', isRegenerating && 'animate-spin')} />
          {isRegenerating ? 'Regenerating...' : 'Regenerate Segment'}
        </button>
      </div>
    </div>
  )
}

// Collapsible section component
function CollapsibleSection({
  title,
  icon,
  expanded,
  onToggle,
  children
}: {
  title: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-zinc-300">
          {icon}
          <span className="text-xs font-medium">{title}</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        )}
      </button>
      {expanded && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}
