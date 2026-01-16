'use client'

import { useMemo, useCallback } from 'react'
import { RefreshCw, Plus, GripVertical, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import type { SetSegment } from '@/types'

interface SegmentBarProps {
  className?: string
  onSegmentClick?: (segmentId: string) => void
  onAddSegment?: () => void
}

export function SegmentBar({ className, onSegmentClick, onAddSegment }: SegmentBarProps) {
  const {
    segments,
    activeSegmentId,
    isRegeneratingSegment,
    currentSet,
    setActiveSegment,
    removeSegment,
    regenerateSegment,
    subscription,
  } = useYTDJStore()

  const playlist = currentSet?.playlist || []
  const totalTracks = playlist.length
  const isSegmented = currentSet?.isSegmented && segments.length > 0

  // Calculate total duration across all segments
  const totalDuration = useMemo(() => {
    return segments.reduce((total, seg) => {
      if (seg.duration.type === 'tracks') {
        return total + seg.duration.count
      } else {
        return total + seg.duration.duration
      }
    }, 0)
  }, [segments])

  // Get segment width as percentage
  const getSegmentWidth = useCallback((segment: SetSegment) => {
    if (totalDuration === 0) return 100 / Math.max(segments.length, 1)

    if (segment.duration.type === 'tracks') {
      return (segment.duration.count / totalDuration) * 100
    } else {
      return (segment.duration.duration / totalDuration) * 100
    }
  }, [totalDuration, segments.length])

  // Format duration label
  const formatDuration = (segment: SetSegment) => {
    if (segment.duration.type === 'tracks') {
      return `${segment.duration.count} tracks`
    } else {
      return `${segment.duration.duration} min`
    }
  }

  // Get track count for segment
  const getSegmentTrackCount = (segment: SetSegment) => {
    if (segment.startIndex === undefined || segment.endIndex === undefined) {
      return 0
    }
    return segment.endIndex - segment.startIndex + 1
  }

  const handleSegmentClick = (segmentId: string) => {
    setActiveSegment(segmentId)
    onSegmentClick?.(segmentId)
  }

  const handleRemoveSegment = (e: React.MouseEvent, segmentId: string) => {
    e.stopPropagation()
    removeSegment(segmentId)
  }

  if (!isSegmented) {
    return null
  }

  return (
    <div className={cn('relative w-full', className)}>
      {/* Segment blocks */}
      <div className="flex items-stretch h-10 rounded-lg overflow-hidden bg-zinc-900/50 border border-zinc-800">
        {segments.map((segment, index) => {
          const isActive = activeSegmentId === segment.id
          const isRegenerating = isRegeneratingSegment === segment.id
          const trackCount = getSegmentTrackCount(segment)
          const width = getSegmentWidth(segment)

          return (
            <div
              key={segment.id}
              className={cn(
                'relative flex items-center justify-between px-2 cursor-pointer transition-all group',
                'border-r border-zinc-700/50 last:border-r-0',
                isActive && 'ring-2 ring-inset ring-white/30',
                isRegenerating && 'animate-pulse'
              )}
              style={{
                width: `${width}%`,
                backgroundColor: `${segment.color}20`,
                minWidth: '80px'
              }}
              onClick={() => handleSegmentClick(segment.id)}
            >
              {/* Drag handle (for future reordering) */}
              <div className="opacity-0 group-hover:opacity-50 cursor-grab">
                <GripVertical className="w-3 h-3 text-zinc-400" />
              </div>

              {/* Segment info */}
              <div className="flex-1 min-w-0 px-1">
                <div className="flex items-center gap-1.5">
                  {/* Color dot */}
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: segment.color }}
                  />
                  {/* Name */}
                  <span className="text-xs font-medium text-zinc-200 truncate">
                    {segment.name}
                  </span>
                </div>
                {/* Duration label */}
                <div className="text-[10px] text-zinc-500 truncate">
                  {formatDuration(segment)}
                  {totalTracks > 0 && trackCount > 0 && (
                    <span className="text-zinc-600"> ({trackCount})</span>
                  )}
                </div>
              </div>

              {/* Actions (visible on hover) */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Regenerate button */}
                <button
                  className={cn(
                    'p-1 rounded hover:bg-white/10 transition-colors',
                    isRegenerating && 'animate-spin'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    regenerateSegment(segment.id)
                  }}
                  title="Regenerate this segment"
                  disabled={isRegenerating}
                >
                  <RefreshCw className="w-3 h-3 text-zinc-400" />
                </button>

                {/* Delete button */}
                {segments.length > 1 && (
                  <button
                    className="p-1 rounded hover:bg-red-500/20 transition-colors"
                    onClick={(e) => handleRemoveSegment(e, segment.id)}
                    title="Remove segment"
                  >
                    <Trash2 className="w-3 h-3 text-zinc-500 hover:text-red-400" />
                  </button>
                )}
              </div>

              {/* Active indicator */}
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: segment.color }}
                />
              )}
            </div>
          )
        })}

        {/* Add segment button */}
        <button
          className={cn(
            'flex items-center justify-center px-2 min-w-[40px]',
            'bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors',
            'border-l border-zinc-700/50'
          )}
          onClick={onAddSegment}
          title="Add segment"
        >
          <Plus className="w-4 h-4 text-zinc-500 hover:text-zinc-300" />
        </button>
      </div>

      {/* Segment boundary markers (vertical lines that extend to curve) */}
      <div className="absolute top-full left-0 right-0 h-2 pointer-events-none">
        {segments.slice(0, -1).map((segment, index) => {
          // Calculate cumulative width up to this segment
          const cumulativeWidth = segments
            .slice(0, index + 1)
            .reduce((sum, s) => sum + getSegmentWidth(s), 0)

          return (
            <div
              key={`boundary-${segment.id}`}
              className="absolute top-0 w-px h-full"
              style={{
                left: `${cumulativeWidth}%`,
                backgroundColor: `${segment.color}40`
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

// Compact version for smaller spaces
export function SegmentBarCompact({ className }: { className?: string }) {
  const { segments, activeSegmentId, setActiveSegment, currentSet } = useYTDJStore()
  const isSegmented = currentSet?.isSegmented && segments.length > 0

  if (!isSegmented) return null

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {segments.map((segment) => (
        <button
          key={segment.id}
          className={cn(
            'px-2 py-0.5 rounded text-xs font-medium transition-all',
            activeSegmentId === segment.id
              ? 'ring-1 ring-white/30'
              : 'opacity-70 hover:opacity-100'
          )}
          style={{
            backgroundColor: `${segment.color}30`,
            color: segment.color
          }}
          onClick={() => setActiveSegment(segment.id)}
        >
          {segment.name}
        </button>
      ))}
    </div>
  )
}
