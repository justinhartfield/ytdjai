'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import type { PlaylistNode } from '@/types'

interface EnergyTimelineProps {
  playlist: PlaylistNode[]
  playingIndex: number | null
  onSeekToTrack: (index: number) => void
}

export function EnergyTimeline({ playlist, playingIndex, onSeekToTrack }: EnergyTimelineProps) {
  // Generate SVG path from playlist energy levels
  const { path, points } = useMemo(() => {
    if (playlist.length === 0) {
      return { path: '', points: [] }
    }

    const height = 200
    const padding = 20
    const availableHeight = height - padding * 2
    const stepHeight = availableHeight / Math.max(playlist.length - 1, 1)

    const points = playlist.map((node, index) => {
      const energy = node.track.energy || 50
      const normalizedEnergy = Math.min(100, Math.max(0, energy))
      const x = padding + (normalizedEnergy / 100) * 60
      const y = padding + index * stepHeight
      return { x, y, energy: normalizedEnergy, index }
    })

    if (points.length === 1) {
      return {
        path: `M ${points[0].x} ${points[0].y}`,
        points
      }
    }

    // Create smooth curve path
    let path = `M ${points[0].x} ${points[0].y}`
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1]
      const curr = points[i]
      const midY = (prev.y + curr.y) / 2
      path += ` Q ${prev.x} ${midY}, ${curr.x} ${curr.y}`
    }

    return { path, points }
  }, [playlist])

  if (playlist.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-3 text-center">
        <Zap className="w-6 h-6 text-white/20 mb-2" />
        <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider">
          Energy Arc
        </span>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-cyan-400" />
          <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Energy</span>
        </div>
      </div>

      {/* SVG Timeline */}
      <div className="flex-1 relative">
        <svg
          viewBox="0 0 100 220"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Background gradient */}
          <defs>
            <linearGradient id="energyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(0, 242, 255, 0.1)" />
              <stop offset="100%" stopColor="rgba(255, 0, 229, 0.1)" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00f2ff" />
              <stop offset="50%" stopColor="#00f2ff" />
              <stop offset="100%" stopColor="#ff00e5" />
            </linearGradient>
          </defs>

          {/* Energy curve fill */}
          {path && (
            <path
              d={`${path} L 20 ${200} L 20 20 Z`}
              fill="url(#energyGradient)"
              opacity={0.3}
            />
          )}

          {/* Energy curve line */}
          {path && (
            <motion.path
              d={path}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          )}

          {/* Track position markers */}
          {points.map((point, index) => (
            <g
              key={index}
              onClick={() => onSeekToTrack(index)}
              className="cursor-pointer"
            >
              {/* Clickable area */}
              <rect
                x={0}
                y={point.y - 10}
                width={100}
                height={20}
                fill="transparent"
              />

              {/* Point marker */}
              <motion.circle
                cx={point.x}
                cy={point.y}
                r={playingIndex === index ? 6 : 4}
                fill={playingIndex === index ? '#00f2ff' : '#0a0c1c'}
                stroke={playingIndex === index ? '#00f2ff' : 'rgba(255,255,255,0.3)'}
                strokeWidth={playingIndex === index ? 2 : 1}
                initial={{ scale: 0 }}
                animate={{
                  scale: 1,
                  ...(playingIndex === index && {
                    boxShadow: '0 0 20px rgba(0,242,255,0.5)'
                  })
                }}
                transition={{ delay: index * 0.05 }}
              />

              {/* Track number */}
              <text
                x={85}
                y={point.y + 3}
                fontSize="8"
                fill={playingIndex === index ? '#00f2ff' : 'rgba(255,255,255,0.4)'}
                fontWeight="bold"
                textAnchor="end"
              >
                {String(index + 1).padStart(2, '0')}
              </text>
            </g>
          ))}

          {/* Playing indicator glow */}
          {playingIndex !== null && points[playingIndex] && (
            <motion.circle
              cx={points[playingIndex].x}
              cy={points[playingIndex].y}
              r={12}
              fill="none"
              stroke="#00f2ff"
              strokeWidth={1}
              opacity={0.5}
              animate={{
                r: [12, 18, 12],
                opacity: [0.5, 0.2, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          )}
        </svg>
      </div>
    </div>
  )
}
