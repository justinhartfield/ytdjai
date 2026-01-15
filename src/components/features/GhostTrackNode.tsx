'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { AIProvider } from '@/types'

/**
 * AI Provider Badge - shows which AI generated a track
 * Displays the provider logo with distinct colors
 */
interface AIProviderBadgeProps {
  provider: AIProvider
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showLabel?: boolean
}

export function AIProviderBadge({ provider, size = 'sm', className, showLabel = false }: AIProviderBadgeProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const iconSizeClasses = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5'
  }

  const providerConfig = {
    openai: {
      label: 'OpenAI',
      fullLabel: 'OpenAI',
      bgColor: 'bg-[#10a37f]',
      textColor: 'text-white',
      // OpenAI logo - hexagonal shape
      icon: (
        <svg viewBox="0 0 24 24" className={cn(iconSizeClasses[size], 'fill-current')}>
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
        </svg>
      )
    },
    claude: {
      label: 'Claude',
      fullLabel: 'Claude',
      bgColor: 'bg-[#d97706]',
      textColor: 'text-white',
      // Anthropic/Claude logo - stylized "A"
      icon: (
        <svg viewBox="0 0 24 24" className={cn(iconSizeClasses[size], 'fill-current')}>
          <path d="M17.304 3.541l-5.296 16.918H9.529L4.227 3.541h3.2l3.5 12.47 3.46-12.47h2.917zm2.469 0h3.027L17.5 20.459h-3.027l5.3-16.918z"/>
        </svg>
      )
    },
    gemini: {
      label: 'Gemini',
      fullLabel: 'Gemini',
      bgColor: 'bg-[#4285f4]',
      textColor: 'text-white',
      // Google Gemini logo - sparkle
      icon: (
        <svg viewBox="0 0 28 28" className={cn(iconSizeClasses[size], 'fill-current')}>
          <path d="M14 28C14 26.0633 13.6267 24.2433 12.88 22.54C12.1567 20.8367 11.165 19.355 9.905 18.095C8.645 16.835 7.16333 15.8433 5.46 15.12C3.75667 14.3733 1.93667 14 0 14C1.93667 14 3.75667 13.6383 5.46 12.915C7.16333 12.1683 8.645 11.165 9.905 9.905C11.165 8.645 12.1567 7.16333 12.88 5.46C13.6267 3.75667 14 1.93667 14 0C14 1.93667 14.3617 3.75667 15.085 5.46C15.8317 7.16333 16.835 8.645 18.095 9.905C19.355 11.165 20.8367 12.1683 22.54 12.915C24.2433 13.6383 26.0633 14 28 14C26.0633 14 24.2433 14.3733 22.54 15.12C20.8367 15.8433 19.355 16.835 18.095 18.095C16.835 19.355 15.8317 20.8367 15.085 22.54C14.3617 24.2433 14 26.0633 14 28Z"/>
        </svg>
      )
    }
  }

  const config = providerConfig[provider]

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center',
          sizeClasses[size],
          config.bgColor,
          config.textColor
        )}
        title={config.fullLabel}
      >
        {config.icon}
      </div>
      {showLabel && (
        <span className={cn(
          'font-bold uppercase tracking-wider',
          size === 'sm' ? 'text-[8px]' : size === 'md' ? 'text-[9px]' : 'text-[10px]',
          'text-white/70'
        )}>
          {config.fullLabel}
        </span>
      )}
    </div>
  )
}

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
