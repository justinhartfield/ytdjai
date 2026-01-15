'use client'

import { useEffect } from 'react'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'

interface CreditsDisplayProps {
  className?: string
  showLabel?: boolean
}

export function CreditsDisplay({ className, showLabel = true }: CreditsDisplayProps) {
  const { subscription, fetchSubscription } = useYTDJStore()

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  const { creditsRemaining, limits } = subscription
  const percentage = limits.monthlyCredits > 0
    ? (creditsRemaining / limits.monthlyCredits) * 100
    : 0

  // Determine color based on remaining credits
  const getColorClass = () => {
    if (percentage > 50) return 'text-green-400'
    if (percentage > 20) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Zap className={cn('w-4 h-4', getColorClass())} />
      <div className="flex items-center gap-1">
        <span className={cn('font-bold text-sm', getColorClass())}>
          {creditsRemaining}
        </span>
        {showLabel && (
          <span className="text-white/50 text-xs">
            / {limits.monthlyCredits}
          </span>
        )}
      </div>
    </div>
  )
}
