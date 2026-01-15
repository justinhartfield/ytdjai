'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Lock, Trash2, GripHorizontal } from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { haptics } from '@/lib/haptics'
import type { PlaylistNode } from '@/types'

interface LandscapeTrackCardProps {
  node: PlaylistNode
  index: number
  isPlaying: boolean
  isSelected: boolean
  isDragging: boolean
  onSelect: () => void
  onDelete: () => void
  onLockToggle: () => void
  onDragStart: (e: React.TouchEvent | React.MouseEvent) => void
}

export function LandscapeTrackCard({
  node,
  index,
  isPlaying,
  isSelected,
  isDragging,
  onSelect,
  onDelete,
  onLockToggle,
  onDragStart
}: LandscapeTrackCardProps) {
  const { playTrack, pauseTrack, player } = useYTDJStore()
  const { playingNodeIndex, isPlaying: isCurrentlyPlaying } = player

  const [showDelete, setShowDelete] = useState(false)
  const touchStartY = useRef<number>(0)
  const lastTapTime = useRef<number>(0)

  const handlePlayToggle = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    haptics.medium()

    if (isPlaying && isCurrentlyPlaying) {
      pauseTrack()
    } else {
      playTrack(index)
    }
  }

  const handleTap = () => {
    const now = Date.now()
    const timeSinceLastTap = now - lastTapTime.current

    if (timeSinceLastTap < 300) {
      // Double tap - toggle lock
      haptics.medium()
      onLockToggle()
    } else {
      // Single tap - select
      onSelect()
    }

    lastTapTime.current = now
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY
    const deltaY = touchStartY.current - currentY

    // Swipe up to reveal delete
    if (deltaY > 30 && !showDelete) {
      setShowDelete(true)
      haptics.warning()
    } else if (deltaY < -30 && showDelete) {
      setShowDelete(false)
    }
  }

  const handleDelete = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    haptics.error()
    onDelete()
  }

  return (
    <motion.div
      className={cn(
        'relative w-[120px] select-none',
        isDragging && 'z-50'
      )}
      animate={{
        scale: isDragging ? 0.95 : 1,
        opacity: isDragging ? 0.8 : 1
      }}
      transition={{ duration: 0.2 }}
    >
      {/* Delete button - revealed on swipe up */}
      <motion.div
        className="absolute -bottom-2 left-0 right-0 flex justify-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: showDelete ? 1 : 0, y: showDelete ? 0 : 10 }}
      >
        <button
          onClick={handleDelete}
          className="px-4 py-1.5 rounded-full bg-red-500/90 text-white text-xs font-bold flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </motion.div>

      {/* Main Card */}
      <motion.div
        onClick={handleTap}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className={cn(
          'relative bg-[#0a0c1c]/90 backdrop-blur-xl rounded-xl overflow-hidden',
          'border-2 transition-all cursor-pointer',
          isSelected && 'border-cyan-400 shadow-[0_0_25px_rgba(0,242,255,0.4)]',
          isPlaying && !isSelected && 'border-green-400 shadow-[0_0_25px_rgba(34,197,94,0.4)]',
          !isSelected && !isPlaying && 'border-white/10 hover:border-white/20'
        )}
        whileTap={{ scale: 0.98 }}
      >
        {/* Drag Handle */}
        <div
          onMouseDown={onDragStart}
          onTouchStart={onDragStart}
          className="absolute top-2 left-1/2 -translate-x-1/2 z-10 cursor-grab active:cursor-grabbing touch-none"
        >
          <GripHorizontal className="w-5 h-5 text-white/30" />
        </div>

        {/* Track Number Badge */}
        <div className="absolute top-2 left-2 z-10">
          <div className={cn(
            'w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold',
            isPlaying ? 'bg-green-500 text-black' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
          )}>
            {String(index + 1).padStart(2, '0')}
          </div>
        </div>

        {/* Lock Badge */}
        {node.isLocked && (
          <div className="absolute top-2 right-2 z-10">
            <div className="w-5 h-5 rounded-md bg-cyan-500 flex items-center justify-center">
              <Lock className="w-3 h-3 text-black" />
            </div>
          </div>
        )}

        {/* Thumbnail */}
        <div className="relative aspect-square">
          <img
            src={node.track.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=200&h=200&fit=crop'}
            alt={node.track.title}
            className="w-full h-full object-cover"
            draggable={false}
          />

          {/* Play Button Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            onClick={handlePlayToggle}
          >
            <motion.button
              whileTap={{ scale: 0.9 }}
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                isPlaying ? 'bg-green-500 text-black' : 'bg-white text-black'
              )}
            >
              {isPlaying && isCurrentlyPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </motion.button>
          </motion.div>

          {/* Playing Animation */}
          {isPlaying && isCurrentlyPlaying && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-green-400 rounded-full"
                  animate={{
                    height: [8, 16, 8],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    delay: i * 0.1
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className="p-2">
          <h3 className="text-xs font-bold text-white truncate leading-tight">
            {node.track.title}
          </h3>
          <p className="text-[10px] text-white/50 truncate mt-0.5">
            {node.track.artist}
          </p>

          {/* Meta badges */}
          <div className="flex items-center gap-1.5 mt-2">
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[8px] font-bold',
              'bg-cyan-500/20 text-cyan-400'
            )}>
              E:{node.track.energy || '?'}
            </span>
            <span className="text-[9px] text-white/40 font-mono">
              {formatDuration(node.track.duration)}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
