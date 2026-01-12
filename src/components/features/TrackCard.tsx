'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Play,
  Pause,
  MoreVertical,
  GripVertical,
  RefreshCw,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDuration, getTransitionQualityColor, getTransitionQualityLabel } from '@/lib/utils'
import type { Track, TransitionQuality } from '@/types'
import { Badge } from '@/components/ui'

interface TrackCardProps {
  track: Track
  index: number
  isPlaying?: boolean
  isActive?: boolean
  transitionQuality?: TransitionQuality
  onPlay?: () => void
  onPause?: () => void
  onSwap?: () => void
  onRemove?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  draggable?: boolean
  className?: string
}

export function TrackCard({
  track,
  index,
  isPlaying = false,
  isActive = false,
  transitionQuality,
  onPlay,
  onPause,
  onSwap,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  draggable = true,
  className
}: TrackCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true)
    e.dataTransfer.setData('text/plain', track.id)
    e.dataTransfer.effectAllowed = 'move'
    onDragStart?.(e)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false)
    onDragEnd?.(e)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'group relative flex items-center gap-3 p-3 rounded-xl',
        'bg-white/5 border border-white/10',
        'transition-all duration-200',
        isActive && 'border-cyan-500/50 bg-cyan-500/10',
        isDragging && 'opacity-50 scale-95',
        'hover:bg-white/8 hover:border-white/20',
        className
      )}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Drag Handle */}
      {draggable && (
        <div className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white/50">
          <GripVertical className="w-5 h-5" />
        </div>
      )}

      {/* Track Number */}
      <div className="flex-shrink-0 w-8 text-center">
        <span className="text-sm font-mono text-white/40">{String(index + 1).padStart(2, '0')}</span>
      </div>

      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-white/10">
        {track.thumbnail ? (
          <img
            src={track.thumbnail}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white/30" />
          </div>
        )}

        {/* Play Overlay */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'bg-black/50 opacity-0 group-hover:opacity-100',
            'transition-opacity duration-200'
          )}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-white truncate">{track.title}</h4>
        <p className="text-sm text-white/50 truncate">{track.artist}</p>
      </div>

      {/* BPM & Key */}
      <div className="hidden sm:flex items-center gap-2">
        {track.bpm && (
          <Badge variant="default" className="text-xs">
            {track.bpm} BPM
          </Badge>
        )}
        {track.key && (
          <Badge variant="cyan" className="text-xs">
            {track.key}
          </Badge>
        )}
      </div>

      {/* Transition Quality Indicator */}
      {transitionQuality && (
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            getTransitionQualityColor(transitionQuality)
          )}
          title={getTransitionQualityLabel(transitionQuality)}
        />
      )}

      {/* Duration */}
      <span className="text-sm font-mono text-white/40">
        {formatDuration(track.duration)}
      </span>

      {/* Actions Menu */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            'text-white/40 hover:text-white hover:bg-white/10',
            showMenu && 'bg-white/10 text-white'
          )}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                'absolute right-0 top-full mt-1 z-50',
                'w-48 py-2 rounded-lg',
                'bg-[#0a0c1c] border border-white/10',
                'shadow-xl shadow-black/50'
              )}
            >
              <button
                onClick={() => {
                  onSwap?.()
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
              >
                <RefreshCw className="w-4 h-4" />
                AI Swap Track
              </button>
              <button
                onClick={() => {
                  onMoveUp?.()
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
              >
                <ChevronUp className="w-4 h-4" />
                Move Up
              </button>
              <button
                onClick={() => {
                  onMoveDown?.()
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
              >
                <ChevronDown className="w-4 h-4" />
                Move Down
              </button>
              <div className="border-t border-white/10 my-1" />
              <button
                onClick={() => {
                  onRemove?.()
                  setShowMenu(false)
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  )
}
