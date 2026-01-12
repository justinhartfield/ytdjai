'use client'

import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}

export function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'glass-panel rounded-2xl p-6',
        hover && 'transition-all duration-300 cursor-pointer hover:border-accent-cyan/30 hover:shadow-lg hover:shadow-accent-cyan/10',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
