'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart, Eye, Clock, Music2, Play } from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import type { MixtapeCard as MixtapeCardType } from '@/types'
import { CoverPreview } from './CoverPreview'

interface MixtapeCardProps {
  mixtape: MixtapeCardType
  index?: number
}

export function MixtapeCard({ mixtape, index = 0 }: MixtapeCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isLiked, setIsLiked] = useState(() => {
    if (typeof window === 'undefined') return false
    const likedMixtapes = JSON.parse(localStorage.getItem('ytdj-liked-mixtapes') || '[]')
    return likedMixtapes.includes(mixtape.shareSlug)
  })

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const newIsLiked = !isLiked
    setIsLiked(newIsLiked)

    // Update localStorage
    const likedMixtapes = JSON.parse(localStorage.getItem('ytdj-liked-mixtapes') || '[]')
    if (newIsLiked) {
      likedMixtapes.push(mixtape.shareSlug)
    } else {
      const index = likedMixtapes.indexOf(mixtape.shareSlug)
      if (index > -1) likedMixtapes.splice(index, 1)
    }
    localStorage.setItem('ytdj-liked-mixtapes', JSON.stringify(likedMixtapes))

    // Update server
    try {
      await fetch('/api/mixtape/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: mixtape.shareSlug, action: newIsLiked ? 'like' : 'unlike' }),
      })
    } catch (err) {
      console.error('[MixtapeCard] Like error:', err)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/share/${mixtape.shareSlug}`}>
        <div
          className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 hover:bg-white/8 transition-all duration-300"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Cover Art */}
          <div className="relative aspect-square overflow-hidden">
            <CoverPreview
              template={mixtape.coverTemplate}
              colors={mixtape.coverColors}
              title={mixtape.title}
              subtitle=""
              trackCount={mixtape.trackCount}
              duration={mixtape.totalDuration}
              size="lg"
              className="w-full h-full"
            />

            {/* Play overlay on hover */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              className="absolute inset-0 bg-black/50 flex items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <Play className="w-8 h-8 text-white fill-white ml-1" />
              </div>
            </motion.div>

            {/* Like button */}
            <button
              onClick={handleLike}
              className={cn(
                "absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all",
                isLiked
                  ? "bg-pink-500/80 text-white"
                  : "bg-black/50 text-white/70 hover:bg-black/70 hover:text-white"
              )}
            >
              <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
            </button>
          </div>

          {/* Info */}
          <div className="p-4">
            <h3 className="font-bold text-white truncate mb-1 group-hover:text-cyan-400 transition-colors">
              {mixtape.title}
            </h3>

            {mixtape.subtitle && (
              <p className="text-sm text-gray-500 truncate mb-3">
                {mixtape.subtitle}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Music2 className="w-3.5 h-3.5" />
                  {mixtape.trackCount}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {Math.floor(mixtape.totalDuration / 60)}m
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {formatCount(mixtape.viewCount)}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5" />
                  {formatCount(mixtape.likeCount)}
                </span>
              </div>
            </div>

            {/* Tags */}
            {mixtape.tags && mixtape.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {mixtape.tags.slice(0, 3).map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-white/5 text-[10px] text-gray-500 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}
