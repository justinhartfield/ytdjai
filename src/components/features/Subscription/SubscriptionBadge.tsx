'use client'

import { Crown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'

interface SubscriptionBadgeProps {
  className?: string
}

export function SubscriptionBadge({ className }: SubscriptionBadgeProps) {
  const { subscription } = useYTDJStore()

  if (subscription.tier !== 'pro') {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-2 py-0.5 rounded-full',
        'bg-gradient-to-r from-purple-500/20 to-pink-500/20',
        'border border-purple-500/30',
        className
      )}
    >
      <Crown className="w-3 h-3 text-purple-400" />
      <span className="text-xs font-bold text-purple-400">PRO</span>
    </div>
  )
}
