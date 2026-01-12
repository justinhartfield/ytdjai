'use client'

import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  max?: number
  className?: string
  variant?: 'default' | 'gradient' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function Progress({
  value,
  max = 100,
  className,
  variant = 'default',
  size = 'md',
  showLabel = false
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }

  const variantClasses = {
    default: 'bg-cyan-500',
    gradient: 'bg-gradient-to-r from-cyan-500 to-magenta-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500'
  }

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-white/60 mb-1">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        className={cn(
          'w-full bg-white/10 rounded-full overflow-hidden',
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            variantClasses[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

interface CircularProgressProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  className?: string
  showValue?: boolean
}

export function CircularProgress({
  value,
  max = 100,
  size = 48,
  strokeWidth = 4,
  className,
  showValue = true
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-white/10"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progress-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-300 ease-out"
        />
        <defs>
          <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00d4ff" />
            <stop offset="100%" stopColor="#ff00ff" />
          </linearGradient>
        </defs>
      </svg>
      {showValue && (
        <span className="absolute text-xs font-medium text-white">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}
