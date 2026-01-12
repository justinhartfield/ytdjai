'use client'

import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'cyan' | 'magenta' | 'success' | 'warning' | 'danger'
  removable?: boolean
  onRemove?: () => void
  className?: string
}

export function Badge({
  children,
  variant = 'default',
  removable,
  onRemove,
  className,
}: BadgeProps) {
  const variants = {
    default: 'bg-white/5 border-white/10 text-gray-400',
    cyan: 'bg-accent-cyan/10 border-accent-cyan/30 text-accent-cyan',
    magenta: 'bg-accent-magenta/10 border-accent-magenta/30 text-accent-magenta',
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    danger: 'bg-red-500/10 border-red-500/30 text-red-400',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 border rounded text-[10px] font-bold uppercase tracking-wider',
        variants[variant],
        className
      )}
    >
      {children}
      {removable && (
        <button
          onClick={onRemove}
          className="hover:text-white transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}
