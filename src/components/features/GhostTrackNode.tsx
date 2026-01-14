'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GhostTrackNodeProps {
  index: number
  x: number // percentage position
  y: number // percentage position
  className?: string
}

/**
 * Skeleton loader that looks like a TrackNode
 * Shows animated shimmer while waiting for AI results
 */
export function GhostTrackNode({ index, x, y, className }: GhostTrackNodeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05 // Stagger appearance
      }}
      className={cn(
        "absolute z-30",
        className
      )}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <div className="relative group">
        {/* Outer ring with pulse */}
        <motion.div
          className="w-14 h-14 rounded-full border-2 border-white/10 bg-[#05060f] flex items-center justify-center"
          animate={{
            borderColor: ['rgba(255,255,255,0.1)', 'rgba(0,242,255,0.3)', 'rgba(255,255,255,0.1)'],
            boxShadow: [
              '0 0 0 rgba(0,242,255,0)',
              '0 0 15px rgba(0,242,255,0.3)',
              '0 0 0 rgba(0,242,255,0)'
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: index * 0.2
          }}
        >
          {/* Inner shimmer circle */}
          <motion.div
            className="w-12 h-12 rounded-full overflow-hidden relative bg-gradient-to-br from-white/5 to-white/10"
            animate={{
              background: [
                'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 100%)',
                'linear-gradient(135deg, rgba(0,242,255,0.1) 0%, rgba(255,0,229,0.1) 100%)',
                'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 100%)'
              ]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: index * 0.15
            }}
          >
            {/* Shimmer sweep effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{
                x: ['-100%', '100%']
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: index * 0.1
              }}
            />
          </motion.div>
        </motion.div>

        {/* Loading indicator dot */}
        <motion.div
          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-cyan-500/80 flex items-center justify-center"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.8, 1, 0.8]
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: index * 0.1
          }}
        >
          <motion.div
            className="w-2 h-2 rounded-full bg-white"
            animate={{
              scale: [0.8, 1, 0.8]
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: index * 0.1
            }}
          />
        </motion.div>
      </div>
    </motion.div>
  )
}

/**
 * Ghost track card for list/session views
 */
export function GhostTrackCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
    >
      {/* Track number skeleton */}
      <div className="flex-shrink-0 w-8 text-center">
        <motion.div
          className="h-4 w-6 mx-auto rounded bg-white/10"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.1 }}
        />
      </div>

      {/* Thumbnail skeleton */}
      <motion.div
        className="flex-shrink-0 w-12 h-12 rounded-lg bg-white/10"
        animate={{
          background: [
            'rgba(255,255,255,0.05)',
            'rgba(0,242,255,0.1)',
            'rgba(255,255,255,0.05)'
          ]
        }}
        transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.1 }}
      />

      {/* Text skeleton */}
      <div className="flex-1 min-w-0 space-y-2">
        <motion.div
          className="h-4 rounded bg-white/10 w-3/4"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.1 }}
        />
        <motion.div
          className="h-3 rounded bg-white/10 w-1/2"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.15 }}
        />
      </div>

      {/* Duration skeleton */}
      <motion.div
        className="h-4 w-10 rounded bg-white/10"
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.2 }}
      />
    </motion.div>
  )
}
