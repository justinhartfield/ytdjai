'use client'

import { MixtapeCard } from './MixtapeCard'
import type { MixtapeCard as MixtapeCardType } from '@/types'

interface MixtapeGridProps {
  mixtapes: MixtapeCardType[]
  emptyMessage?: string
}

export function MixtapeGrid({ mixtapes, emptyMessage = 'No mixtapes found' }: MixtapeGridProps) {
  if (mixtapes.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {mixtapes.map((mixtape, index) => (
        <MixtapeCard key={mixtape.shareSlug} mixtape={mixtape} index={index} />
      ))}
    </div>
  )
}
