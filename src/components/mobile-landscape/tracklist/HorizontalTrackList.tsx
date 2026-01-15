'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { haptics } from '@/lib/haptics'
import { LandscapeTrackCard } from './LandscapeTrackCard'
import type { PlaylistNode } from '@/types'

interface HorizontalTrackListProps {
  playlist: PlaylistNode[]
  playingIndex: number | null
  selectedIndex: number | null
  onSelect: (index: number) => void
  onDelete: (index: number) => void
  onLockToggle: (index: number) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onNewSet: () => void
}

export function HorizontalTrackList({
  playlist,
  playingIndex,
  selectedIndex,
  onSelect,
  onDelete,
  onLockToggle,
  onReorder,
  onNewSet
}: HorizontalTrackListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const dragStartX = useRef<number>(0)
  const cardWidth = 130 // Card width + gap

  // Auto-scroll to playing track
  useEffect(() => {
    if (playingIndex !== null && scrollRef.current) {
      const scrollLeft = playingIndex * cardWidth - scrollRef.current.clientWidth / 2 + cardWidth / 2
      scrollRef.current.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: 'smooth'
      })
    }
  }, [playingIndex])

  const handleDragStart = useCallback((e: React.TouchEvent | React.MouseEvent, index: number) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    dragStartX.current = clientX
    setDraggedIndex(index)
    haptics.light()
  }, [])

  const handleDragMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (draggedIndex === null || !scrollRef.current) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const deltaX = clientX - dragStartX.current
    const offset = Math.round(deltaX / cardWidth)
    const targetIndex = Math.max(0, Math.min(playlist.length - 1, draggedIndex + offset))

    if (targetIndex !== draggedIndex && targetIndex !== dropTargetIndex) {
      setDropTargetIndex(targetIndex)
      haptics.selection()
    }
  }, [draggedIndex, playlist.length, dropTargetIndex])

  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null && dropTargetIndex !== null && draggedIndex !== dropTargetIndex) {
      onReorder(draggedIndex, dropTargetIndex)
    }
    setDraggedIndex(null)
    setDropTargetIndex(null)
  }, [draggedIndex, dropTargetIndex, onReorder])

  if (playlist.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-cyan-500/20 to-pink-500/20 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-white/30" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No tracks yet</h3>
          <p className="text-sm text-white/50 mb-4">Generate your first set</p>
          <motion.button
            onClick={onNewSet}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold text-sm"
          >
            Generate Set
          </motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-x-auto overflow-y-hidden scrollbar-hide"
      onMouseMove={draggedIndex !== null ? handleDragMove : undefined}
      onMouseUp={draggedIndex !== null ? handleDragEnd : undefined}
      onMouseLeave={draggedIndex !== null ? handleDragEnd : undefined}
      onTouchMove={draggedIndex !== null ? handleDragMove : undefined}
      onTouchEnd={draggedIndex !== null ? handleDragEnd : undefined}
      style={{
        scrollSnapType: draggedIndex === null ? 'x mandatory' : 'none'
      }}
    >
      <div className="h-full flex items-center gap-3 px-4 py-3">
        {playlist.map((node, index) => (
          <div
            key={node.id}
            className="flex-shrink-0"
            style={{
              scrollSnapAlign: 'center',
              transform: dropTargetIndex === index ? 'translateX(20px)' : undefined,
              transition: 'transform 0.2s ease'
            }}
          >
            <LandscapeTrackCard
              node={node}
              index={index}
              isPlaying={playingIndex === index}
              isSelected={selectedIndex === index}
              isDragging={draggedIndex === index}
              onSelect={() => onSelect(index)}
              onDelete={() => onDelete(index)}
              onLockToggle={() => onLockToggle(index)}
              onDragStart={(e) => handleDragStart(e, index)}
            />
          </div>
        ))}

        {/* Add more tracks button */}
        <motion.div
          className="flex-shrink-0 w-[120px] h-[180px] rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all"
          whileTap={{ scale: 0.95 }}
          onClick={onNewSet}
        >
          <div className="text-center">
            <Sparkles className="w-6 h-6 text-white/30 mx-auto mb-2" />
            <span className="text-xs font-bold text-white/40">Add More</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
