'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDuration, getTransitionQualityColor } from '@/lib/utils'
import type { PlaylistNode, TransitionQuality } from '@/types'
import { useYTDJStore } from '@/store'

interface PlaylistTimelineProps {
  nodes: PlaylistNode[]
  currentTime: number
  totalDuration: number
  isPlaying: boolean
  onSeek: (time: number) => void
  onPlayPause: () => void
  onSkipPrev: () => void
  onSkipNext: () => void
  className?: string
}

export function PlaylistTimeline({
  nodes,
  currentTime,
  totalDuration,
  isPlaying,
  onSeek,
  onPlayPause,
  onSkipPrev,
  onSkipNext,
  className
}: PlaylistTimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [volume, setVolume] = useState(80)
  const [isMuted, setIsMuted] = useState(false)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * totalDuration
    onSeek(Math.max(0, Math.min(newTime, totalDuration)))
  }, [totalDuration, onSeek])

  const handleMouseDown = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const percentage = x / rect.width
    const newTime = percentage * totalDuration
    onSeek(Math.max(0, Math.min(newTime, totalDuration)))
  }, [isDragging, totalDuration, onSeek])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mouseup', handleMouseUp)
      return () => document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseUp])

  // Find current node based on time
  const getCurrentNodeIndex = () => {
    let accumulatedTime = 0
    for (let i = 0; i < nodes.length; i++) {
      accumulatedTime += nodes[i].track.duration
      if (currentTime < accumulatedTime) return i
    }
    return nodes.length - 1
  }

  const currentNodeIndex = getCurrentNodeIndex()

  return (
    <div className={cn('bg-[#0a0c1c] border-t border-white/10', className)}>
      {/* Timeline Visualization */}
      <div className="px-4 py-3">
        {/* Waveform/Node Timeline */}
        <div
          ref={timelineRef}
          className="relative h-16 bg-white/5 rounded-lg overflow-hidden cursor-pointer"
          onClick={handleTimelineClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          {/* Nodes */}
          <div className="absolute inset-0 flex">
            {nodes.map((node, index) => {
              const width = (node.track.duration / totalDuration) * 100
              const isActive = index === currentNodeIndex

              return (
                <div
                  key={node.id}
                  className="relative h-full flex-shrink-0"
                  style={{ width: `${width}%` }}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {/* Waveform Visualization */}
                  <div
                    className={cn(
                      'h-full transition-colors duration-200',
                      isActive
                        ? 'bg-gradient-to-t from-cyan-500/30 to-magenta-500/30'
                        : 'bg-white/5 hover:bg-white/10'
                    )}
                  >
                    {/* Fake waveform bars */}
                    <div className="absolute inset-0 flex items-center justify-around px-1">
                      {Array.from({ length: Math.max(10, Math.floor(width / 2)) }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            'w-0.5 rounded-full transition-colors',
                            isActive ? 'bg-cyan-400/60' : 'bg-white/20'
                          )}
                          style={{
                            height: `${20 + Math.random() * 60}%`
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Transition Indicator */}
                  {index < nodes.length - 1 && node.transitionToNext && (
                    <div
                      className={cn(
                        'absolute right-0 top-0 bottom-0 w-1',
                        getTransitionQualityColor(node.transitionToNext.quality)
                      )}
                    />
                  )}

                  {/* Hover Info */}
                  <AnimatePresence>
                    {hoveredNode === node.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={cn(
                          'absolute bottom-full left-1/2 -translate-x-1/2 mb-2',
                          'px-3 py-2 rounded-lg bg-[#05060f] border border-white/10',
                          'text-xs whitespace-nowrap z-10'
                        )}
                      >
                        <div className="font-medium text-white">{node.track.title}</div>
                        <div className="text-white/50">{node.track.artist}</div>
                        <div className="flex gap-2 mt-1">
                          {node.track.bpm && <span className="text-cyan-400">{node.track.bpm} BPM</span>}
                          {node.track.key && <span className="text-magenta-400">{node.track.key}</span>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>

          {/* Progress Overlay */}
          <div
            className="absolute top-0 left-0 h-full bg-white/10 pointer-events-none"
            style={{ width: `${progress}%` }}
          />

          {/* Playhead */}
          <div
            className={cn(
              'absolute top-0 bottom-0 w-0.5 bg-white shadow-lg shadow-white/50',
              'transform -translate-x-1/2'
            )}
            style={{ left: `${progress}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full" />
          </div>
        </div>

        {/* Time Display */}
        <div className="flex justify-between mt-2 text-xs font-mono text-white/50">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(totalDuration)}</span>
        </div>
      </div>

      {/* Transport Controls */}
      <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
        {/* Left: Current Track Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {nodes[currentNodeIndex] && (
            <>
              <div className="w-10 h-10 rounded bg-white/10 overflow-hidden flex-shrink-0">
                {nodes[currentNodeIndex].track.thumbnail ? (
                  <img
                    src={nodes[currentNodeIndex].track.thumbnail}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-magenta-500/20" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {nodes[currentNodeIndex].track.title}
                </div>
                <div className="text-xs text-white/50 truncate">
                  {nodes[currentNodeIndex].track.artist}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Center: Transport Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSkipPrev}
            className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onClick={onPlayPause}
            className={cn(
              'p-3 rounded-full transition-all duration-200',
              'bg-gradient-to-r from-cyan-500 to-magenta-500',
              'hover:shadow-lg hover:shadow-cyan-500/30',
              'active:scale-95'
            )}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </button>
          <button
            onClick={onSkipNext}
            className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Right: Volume & Fullscreen */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 text-white/60 hover:text-white transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseInt(e.target.value))
                setIsMuted(false)
              }}
              className="w-20 h-1 bg-white/10 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>
          <button className="p-1.5 text-white/60 hover:text-white transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
