'use client'

import { useMemo } from 'react'
import type { CoverTemplateId, CoverColors } from '@/types'
import { getCoverTemplate } from '@/lib/cover-templates'

interface CoverPreviewProps {
  template: CoverTemplateId
  colors: CoverColors
  title?: string
  subtitle?: string
  trackCount?: number
  duration?: number // in seconds
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showOverlay?: boolean
}

const SIZES = {
  sm: { width: 120, height: 120, titleSize: 10, subtitleSize: 7 },
  md: { width: 200, height: 200, titleSize: 14, subtitleSize: 9 },
  lg: { width: 300, height: 300, titleSize: 20, subtitleSize: 12 },
  xl: { width: 400, height: 400, titleSize: 28, subtitleSize: 14 },
}

export function CoverPreview({
  template,
  colors,
  title,
  subtitle,
  trackCount,
  duration,
  size = 'md',
  className = '',
  showOverlay = true,
}: CoverPreviewProps) {
  const templateDef = getCoverTemplate(template)
  const { width, height, titleSize, subtitleSize } = SIZES[size]

  const durationStr = useMemo(() => {
    if (!duration) return ''
    const mins = Math.floor(duration / 60)
    return `${mins} min`
  }, [duration])

  // Generate SVG based on template
  const renderTemplate = () => {
    switch (template) {
      case 'neon-gradient':
        return (
          <>
            <defs>
              <linearGradient id={`grad-${template}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors.primary} stopOpacity="0.8" />
                <stop offset="50%" stopColor={colors.secondary} stopOpacity="0.9" />
                <stop offset="100%" stopColor={colors.accent} stopOpacity="0.8" />
              </linearGradient>
              <filter id={`glow-${template}`}>
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect width="100%" height="100%" fill="#0a0a0f" />
            <rect width="100%" height="100%" fill={`url(#grad-${template})`} />
            <circle cx="20%" cy="30%" r="30%" fill={colors.primary} opacity="0.2" filter={`url(#glow-${template})`} />
            <circle cx="80%" cy="70%" r="25%" fill={colors.accent} opacity="0.15" filter={`url(#glow-${template})`} />
          </>
        )

      case 'vintage-cassette':
        return (
          <>
            <rect width="100%" height="100%" fill={colors.primary} />
            <rect x="10%" y="20%" width="80%" height="60%" rx="8" fill={colors.secondary} />
            <rect x="15%" y="35%" width="30%" height="30%" rx="50%" fill="transparent" stroke={colors.accent} strokeWidth="2" />
            <rect x="55%" y="35%" width="30%" height="30%" rx="50%" fill="transparent" stroke={colors.accent} strokeWidth="2" />
            <rect x="35%" y="75%" width="30%" height="8%" fill={colors.accent} opacity="0.5" />
          </>
        )

      case 'minimal-wave':
        return (
          <>
            <rect width="100%" height="100%" fill={colors.primary} />
            <path
              d={`M0,${height * 0.6} Q${width * 0.25},${height * 0.4} ${width * 0.5},${height * 0.6} T${width},${height * 0.6}`}
              fill="none"
              stroke={colors.accent}
              strokeWidth="2"
              opacity="0.8"
            />
            <path
              d={`M0,${height * 0.65} Q${width * 0.25},${height * 0.45} ${width * 0.5},${height * 0.65} T${width},${height * 0.65}`}
              fill="none"
              stroke={colors.secondary}
              strokeWidth="1"
              opacity="0.4"
            />
          </>
        )

      case 'vinyl-classic':
        return (
          <>
            <rect width="100%" height="100%" fill={colors.primary} />
            <circle cx="50%" cy="50%" r="45%" fill={colors.secondary} opacity="0.1" />
            <circle cx="50%" cy="50%" r="40%" fill="none" stroke={colors.secondary} strokeWidth="0.5" opacity="0.3" />
            <circle cx="50%" cy="50%" r="35%" fill="none" stroke={colors.secondary} strokeWidth="0.5" opacity="0.3" />
            <circle cx="50%" cy="50%" r="30%" fill="none" stroke={colors.secondary} strokeWidth="0.5" opacity="0.3" />
            <circle cx="50%" cy="50%" r="15%" fill={colors.accent} />
            <circle cx="50%" cy="50%" r="3%" fill={colors.primary} />
          </>
        )

      case 'glitch-digital':
        return (
          <>
            <rect width="100%" height="100%" fill="#0a0a0a" />
            <rect x="5%" y="30%" width="60%" height="3%" fill={colors.primary} opacity="0.8" />
            <rect x="35%" y="33%" width="60%" height="3%" fill={colors.secondary} opacity="0.8" />
            <rect x="15%" y="50%" width="70%" height="2%" fill={colors.accent} opacity="0.6" />
            <rect x="0%" y="70%" width="50%" height="4%" fill={colors.primary} opacity="0.4" />
            <rect x="50%" y="72%" width="50%" height="2%" fill={colors.secondary} opacity="0.4" />
          </>
        )

      case 'sunset-gradient':
        return (
          <>
            <defs>
              <linearGradient id={`sunset-${template}`} x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor={colors.accent} />
                <stop offset="50%" stopColor={colors.primary} />
                <stop offset="100%" stopColor={colors.secondary} />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill={`url(#sunset-${template})`} />
            <circle cx="50%" cy="85%" r="20%" fill="white" opacity="0.1" />
          </>
        )

      case 'dark-abstract':
        return (
          <>
            <rect width="100%" height="100%" fill={colors.primary} />
            <polygon points={`0,100 ${width * 0.4},0 ${width * 0.6},100`} fill={colors.secondary} opacity="0.3" />
            <polygon points={`${width},0 ${width * 0.6},100 ${width},100`} fill={colors.accent} opacity="0.2" />
            <circle cx="70%" cy="30%" r="15%" fill={colors.accent} opacity="0.3" />
          </>
        )

      case 'nature-organic':
        return (
          <>
            <rect width="100%" height="100%" fill={colors.secondary} />
            <ellipse cx="30%" cy="70%" rx="25%" ry="35%" fill={colors.primary} opacity="0.4" />
            <ellipse cx="70%" cy="60%" rx="20%" ry="40%" fill={colors.primary} opacity="0.3" />
            <circle cx="80%" cy="20%" r="5%" fill={colors.accent} opacity="0.6" />
          </>
        )

      case 'geometric-bold':
        return (
          <>
            <rect width="100%" height="100%" fill={colors.secondary} />
            <polygon points={`0,0 ${width * 0.6},0 0,${height * 0.6}`} fill={colors.primary} />
            <polygon points={`${width},${height} ${width * 0.4},${height} ${width},${height * 0.4}`} fill={colors.accent} />
            <rect x="40%" y="40%" width="20%" height="20%" fill={colors.secondary} />
          </>
        )

      case 'holographic':
        return (
          <>
            <defs>
              <linearGradient id={`holo-${template}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors.primary} />
                <stop offset="33%" stopColor={colors.secondary} />
                <stop offset="66%" stopColor={colors.accent} />
                <stop offset="100%" stopColor={colors.primary} />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill={`url(#holo-${template})`} />
            <rect width="100%" height="100%" fill="white" opacity="0.1" />
          </>
        )

      case 'paper-texture':
        return (
          <>
            <rect width="100%" height="100%" fill={colors.primary} />
            <rect x="5%" y="5%" width="90%" height="90%" fill={colors.secondary} opacity="0.1" />
            <line x1="10%" y1="80%" x2="90%" y2="80%" stroke={colors.accent} strokeWidth="2" strokeDasharray="5,5" />
          </>
        )

      case 'circuit-tech':
        return (
          <>
            <rect width="100%" height="100%" fill={colors.primary} />
            <line x1="10%" y1="20%" x2="40%" y2="20%" stroke={colors.secondary} strokeWidth="1" opacity="0.5" />
            <line x1="40%" y1="20%" x2="40%" y2="50%" stroke={colors.secondary} strokeWidth="1" opacity="0.5" />
            <line x1="60%" y1="30%" x2="90%" y2="30%" stroke={colors.accent} strokeWidth="1" opacity="0.5" />
            <line x1="60%" y1="30%" x2="60%" y2="70%" stroke={colors.accent} strokeWidth="1" opacity="0.5" />
            <circle cx="40%" cy="20%" r="2%" fill={colors.secondary} />
            <circle cx="60%" cy="70%" r="2%" fill={colors.accent} />
          </>
        )

      default:
        return <rect width="100%" height="100%" fill={colors.primary} />
    }
  }

  const textColor = templateDef.textColor === 'dark' ? colors.secondary : '#ffffff'

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{ width, height }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="absolute inset-0"
      >
        {renderTemplate()}
      </svg>

      {showOverlay && title && (
        <div
          className={`absolute inset-0 flex flex-col p-4 ${
            templateDef.textPosition === 'center'
              ? 'items-center justify-center text-center'
              : templateDef.textPosition === 'bottom-left'
              ? 'items-start justify-end'
              : 'items-start justify-start'
          }`}
        >
          <h3
            className="font-bold leading-tight"
            style={{
              fontSize: titleSize,
              color: textColor,
              textShadow: templateDef.hasGlow ? `0 0 10px ${colors.accent}40` : 'none',
              maxWidth: '90%',
            }}
          >
            {title}
          </h3>
          {subtitle && (
            <p
              className="mt-1 opacity-80"
              style={{
                fontSize: subtitleSize,
                color: textColor,
                maxWidth: '90%',
              }}
            >
              {subtitle}
            </p>
          )}
          {(trackCount || duration) && (
            <div
              className="mt-2 flex items-center gap-2 opacity-60"
              style={{ fontSize: subtitleSize - 1, color: textColor }}
            >
              {trackCount && <span>{trackCount} tracks</span>}
              {trackCount && duration && <span>·</span>}
              {duration && <span>{durationStr}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
