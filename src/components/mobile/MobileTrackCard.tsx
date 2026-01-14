'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Lock, Trash2, GripVertical } from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import { haptics } from '@/lib/haptics'
import type { PlaylistNode } from '@/types'

interface MobileTrackCardProps {
  node: PlaylistNode
  index: number
  isPlaying: boolean
  isSelected: boolean
  onPlay: () => void
  onSelect: () => void
  onDelete: () => void
  onLockToggle: () => void
  onDragStart?: (e: React.TouchEvent, index: number) => void
}

export function MobileTrackCard({
  node,
  index,
  isPlaying,
  isSelected,
  onPlay,
  onSelect,
  onDelete,
  onLockToggle,
  onDragStart
}: MobileTrackCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const touchStartX = useRef<number>(0)
  const isDragging = useRef(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    isDragging.current = false
    haptics.light()
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX
    const deltaX = currentX - touchStartX.current

    // Only allow swipe left (negative deltaX)
    if (deltaX < 0) {
      isDragging.current = true
      setSwipeOffset(Math.max(deltaX, -80)) // Max 80px swipe

      // Haptic feedback when delete button is revealed
      if (deltaX < -40 && swipeOffset >= -40) {
        haptics.medium()
      }
    }
  }

  const handleTouchEnd = () => {
    if (Math.abs(swipeOffset) > 40) {
      // If swiped far enough, keep delete button visible
      setSwipeOffset(-80)
      haptics.warning()
    } else {
      // Reset
      setSwipeOffset(0)
    }
    isDragging.current = false
  }

  const handleDelete = () => {
    haptics.error()
    setSwipeOffset(0)
    onDelete()
  }

  return (
    <div className="relative overflow-hidden">
      {/* Delete Button (revealed on swipe) */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 w-20 bg-red-500/90 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: swipeOffset < -20 ? 1 : 0 }}
      >
        <button
          onClick={handleDelete}
          className="w-full h-full flex items-center justify-center"
        >
          <Trash2 className="w-6 h-6 text-white" />
        </button>
      </motion.div>

      {/* Main Card */}
      <motion.div
        className={cn(
          'relative bg-[#0a0c1c]/80 backdrop-blur-xl rounded-xl border-2 overflow-hidden',
          'transition-all',
          isSelected ? 'border-cyan-400 shadow-[0_0_20px_rgba(0,242,255,0.3)]' : 'border-white/10',
          isPlaying && 'border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]'
        )}
        style={{ x: swipeOffset }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-3 p-3">
          {/* Drag Handle */}
          {onDragStart && (
            <div
              onTouchStart={(e) => {
                e.stopPropagation()
                onDragStart(e, index)
              }}
              className="cursor-grab active:cursor-grabbing p-2 -ml-2 touch-none"
            >
              <GripVertical className="w-5 h-5 text-gray-500" />
            </div>
          )}

          {/* Track Number */}
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <span className="text-sm font-bold text-cyan-400">{String(index + 1).padStart(2, '0')}</span>
          </div>

          {/* Thumbnail */}
          <div
            onClick={onSelect}
            className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-900 cursor-pointer"
          >
            <img
              src={node.track.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop'}
              alt={node.track.title}
              className="w-full h-full object-cover"
            />
            {node.isLocked && (
              <div className="absolute top-1 left-1 bg-cyan-500/90 p-1 rounded">
                <Lock className="w-3 h-3 text-black" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 active:opacity-100 transition-opacity">
              <Play className="w-6 h-6 text-white fill-white" />
            </div>
          </div>

          {/* Track Info */}
          <div onClick={onSelect} className="flex-1 min-w-0 cursor-pointer">
            <h3 className="text-sm font-bold text-white truncate">{node.track.title}</h3>
            <p className="text-xs text-gray-400 truncate">{node.track.artist}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] font-mono text-cyan-400">
                Energy: {node.track.energy || '?'}
              </span>
              <span className="text-[10px] font-mono text-gray-500">
                {formatDuration(node.track.duration)}
              </span>
            </div>
          </div>

          {/* Play Button */}
          <button
            onClick={() => {
              haptics.medium()
              onPlay()
            }}
            className={cn(
              'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all',
              isPlaying
                ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.5)]'
                : 'bg-white text-black hover:bg-cyan-400'
            )}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          {/* Lock Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              haptics.light()
              onLockToggle()
            }}
            className={cn(
              'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all',
              node.isLocked
                ? 'bg-cyan-500 text-black'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            )}
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  )
}
