'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Play, Clock, Zap, Music2, ExternalLink, Copy, Check, Share2, Heart, Eye, Loader2 } from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import type { PublicMixtape } from '@/types'
import { CoverPreview } from '@/components/features/CoverPreview'

interface SharePageProps {
  params: Promise<{ id: string }>
}

export default function SharePage({ params }: SharePageProps) {
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mixtape, setMixtape] = useState<PublicMixtape | null>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [shareSlug, setShareSlug] = useState<string | null>(null)

  // Fetch mixtape data
  useEffect(() => {
    params.then(async (p) => {
      setShareSlug(p.id)
      try {
        const response = await fetch(`/api/mixtape/${p.id}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Mixtape not found')
          } else {
            throw new Error('Failed to load mixtape')
          }
          return
        }
        const data: PublicMixtape = await response.json()
        setMixtape(data)
        setLikeCount(data.likeCount)

        // Check if user has liked this mixtape (localStorage)
        const likedMixtapes = JSON.parse(localStorage.getItem('ytdj-liked-mixtapes') || '[]')
        setIsLiked(likedMixtapes.includes(p.id))
      } catch (err) {
        console.error('[SharePage] Error:', err)
        setError('Failed to load mixtape')
      } finally {
        setIsLoading(false)
      }
    })
  }, [params])

  const stats = useMemo(() => {
    if (!mixtape) return null
    return {
      duration: mixtape.totalDuration,
      trackCount: mixtape.trackCount,
      energyRange: mixtape.energyRange,
      bpmRange: mixtape.bpmRange,
      peakEnergy: mixtape.energyRange.max
    }
  }, [mixtape])

  // Generate curve path for the DNA visualization
  const curvePath = useMemo(() => {
    if (!mixtape || mixtape.playlist.length < 2) return ''

    const playlist = mixtape.playlist
    const points = playlist.map((node, index) => {
      const x = ((index + 1) / (playlist.length + 1)) * 100
      const energy = node.targetEnergy || node.track?.energy || 50
      const y = 90 - ((energy - 1) / 99) * 80
      return { x, y: Math.max(10, Math.min(90, y)) }
    })

    let d = `M ${points[0].x},${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i]
      const next = points[i + 1]
      const cpX = (curr.x + next.x) / 2
      d += ` C ${cpX},${curr.y} ${cpX},${next.y} ${next.x},${next.y}`
    }
    return d
  }, [mixtape])

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLike = async () => {
    if (!shareSlug) return

    const newIsLiked = !isLiked
    setIsLiked(newIsLiked)
    setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1)

    // Update localStorage
    const likedMixtapes = JSON.parse(localStorage.getItem('ytdj-liked-mixtapes') || '[]')
    if (newIsLiked) {
      likedMixtapes.push(shareSlug)
    } else {
      const index = likedMixtapes.indexOf(shareSlug)
      if (index > -1) likedMixtapes.splice(index, 1)
    }
    localStorage.setItem('ytdj-liked-mixtapes', JSON.stringify(likedMixtapes))

    // Update server
    try {
      await fetch('/api/mixtape/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: shareSlug, action: newIsLiked ? 'like' : 'unlike' }),
      })
    } catch (err) {
      console.error('[SharePage] Like error:', err)
    }
  }

  const handleShare = () => {
    if (navigator.share && mixtape) {
      navigator.share({
        title: mixtape.title,
        text: mixtape.subtitle,
        url: window.location.href,
      })
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05060f] text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading mixtape...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !mixtape) {
    return (
      <div className="min-h-screen bg-[#05060f] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black mb-4">404</h1>
          <p className="text-gray-400 mb-8">{error || 'Mixtape not found'}</p>
          <Link
            href="/"
            className="px-6 py-3 bg-cyan-500 text-black font-bold rounded-xl hover:bg-cyan-400 transition-all"
          >
            Create Your Own Mixtape
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#05060f] text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 blur-[150px] rounded-full animate-pulse"
          style={{ backgroundColor: `${mixtape.coverColors.primary}10` }} />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 blur-[150px] rounded-full animate-pulse"
          style={{ backgroundColor: `${mixtape.coverColors.accent}10`, animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-cyan-500 to-pink-500 flex items-center justify-center font-black text-black text-sm">YT</div>
            <span className="text-lg font-extrabold tracking-tighter uppercase">YTDJ<span className="text-cyan-400">.AI</span></span>
          </Link>
          <Link
            href="/"
            className="px-4 py-2 bg-cyan-500 text-black text-xs font-black uppercase tracking-widest rounded-lg hover:bg-cyan-400 transition-all"
          >
            Create Your Own
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Hero Section with Cover */}
        <section className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col md:flex-row items-center gap-8"
          >
            {/* Cover Art */}
            <div className="flex-shrink-0">
              <CoverPreview
                template={mixtape.coverTemplate}
                colors={mixtape.coverColors}
                title={mixtape.title}
                subtitle={mixtape.subtitle}
                trackCount={mixtape.trackCount}
                duration={mixtape.totalDuration}
                size="xl"
                className="shadow-2xl"
              />
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-3">
                {mixtape.title}
              </h1>
              {mixtape.subtitle && (
                <p className="text-lg text-gray-400 mb-4">
                  {mixtape.subtitle}
                </p>
              )}

              {/* Author & Stats */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-500 mb-6">
                <span>by @{mixtape.authorName}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {mixtape.viewCount.toLocaleString()} views
                </span>
                <span>·</span>
                <span>{mixtape.trackCount} tracks</span>
                <span>·</span>
                <span>{Math.floor(mixtape.totalDuration / 60)} min</span>
              </div>

              {/* Tags */}
              {mixtape.tags && mixtape.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-6">
                  {mixtape.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-white/5 text-xs text-gray-400 rounded-full border border-white/10"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Like Button */}
              <button
                onClick={handleLike}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all",
                  isLiked
                    ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                    : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                )}
              >
                <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
                <span>{likeCount.toLocaleString()}</span>
              </button>
            </div>
          </motion.div>
        </section>

        {/* Description */}
        {mixtape.description && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-16 p-6 bg-white/5 border border-white/10 rounded-2xl"
          >
            <p className="text-gray-300 leading-relaxed">{mixtape.description}</p>
          </motion.section>
        )}

        {/* DNA Curve Visualization */}
        <motion.section
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-16 p-8 bg-white/5 border border-white/10 rounded-3xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: mixtape.coverColors.primary }} />
              Energy Arc
            </h2>
            <div className="flex items-center gap-4 text-[10px] font-bold text-gray-600 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: mixtape.coverColors.primary }} /> Energy
              </span>
            </div>
          </div>

          <div className="relative h-32 overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="shareGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={mixtape.coverColors.primary} />
                  <stop offset="50%" stopColor={mixtape.coverColors.accent} />
                  <stop offset="100%" stopColor={mixtape.coverColors.primary} />
                </linearGradient>
              </defs>
              <path
                d={curvePath}
                fill="none"
                stroke="url(#shareGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 10px ${mixtape.coverColors.primary}80)` }}
              />
              {/* Track markers */}
              {mixtape.playlist.map((node, index) => {
                const x = ((index + 1) / (mixtape.playlist.length + 1)) * 100
                const energy = node.targetEnergy || node.track?.energy || 50
                const y = 90 - ((energy - 1) / 99) * 80
                return (
                  <circle
                    key={node.id}
                    cx={x}
                    cy={Math.max(10, Math.min(90, y))}
                    r="3"
                    fill={mixtape.coverColors.primary}
                    style={{ filter: `drop-shadow(0 0 5px ${mixtape.coverColors.primary})` }}
                  />
                )
              })}
            </svg>
          </div>
        </motion.section>

        {/* Stats */}
        {stats && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
          >
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center">
              <Clock className="w-6 h-6 mx-auto mb-2" style={{ color: mixtape.coverColors.primary }} />
              <div className="text-2xl font-black text-white">{formatDuration(stats.duration)}</div>
              <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Duration</div>
            </div>
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center">
              <Zap className="w-6 h-6 mx-auto mb-2" style={{ color: mixtape.coverColors.accent }} />
              <div className="text-2xl font-black text-white">{stats.energyRange.min}-{stats.energyRange.max}</div>
              <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Energy Range</div>
            </div>
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center">
              <Music2 className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-black text-white">{stats.trackCount}</div>
              <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Tracks</div>
            </div>
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center">
              <Heart className="w-6 h-6 text-pink-400 mx-auto mb-2" />
              <div className="text-2xl font-black text-white">{likeCount.toLocaleString()}</div>
              <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Likes</div>
            </div>
          </motion.section>
        )}

        {/* YouTube Embed (if playlist exists) */}
        {mixtape.youtubePlaylistId && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mb-16"
          >
            <h2 className="text-lg font-black uppercase tracking-wider mb-6">Listen Now</h2>
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/50">
              <iframe
                src={`https://www.youtube.com/embed/videoseries?list=${mixtape.youtubePlaylistId}&autoplay=0`}
                title={mixtape.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </motion.section>
        )}

        {/* Tracklist */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-lg font-black uppercase tracking-wider mb-6">Tracklist</h2>
          <div className="space-y-2">
            {mixtape.playlist.map((node, index) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.03 }}
                className="group flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all"
              >
                <div className="w-8 text-center text-sm font-mono text-gray-600">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/50 relative flex-shrink-0">
                  {node.track.thumbnail ? (
                    <img
                      src={node.track.thumbnail}
                      alt={node.track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/10 to-white/5">
                      <Music2 className="w-5 h-5 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">{node.track.title}</div>
                  <div className="text-sm text-gray-500 truncate">{node.track.artist}</div>
                </div>
                <div className="hidden sm:block text-sm font-mono" style={{ color: mixtape.coverColors.primary }}>
                  Energy: {node.track.energy || node.targetEnergy || '—'}
                </div>
                <div className="text-sm font-mono text-gray-600">
                  {formatDuration(node.track.duration)}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTAs */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col md:flex-row gap-4 justify-center items-center"
        >
          <Link
            href={`/?remix=${shareSlug}`}
            className="w-full md:w-auto px-8 py-4 text-black font-black text-sm uppercase tracking-widest rounded-xl hover:opacity-90 transition-all text-center"
            style={{ background: `linear-gradient(135deg, ${mixtape.coverColors.primary}, ${mixtape.coverColors.accent})` }}
          >
            Remix This Set
          </Link>

          {mixtape.youtubePlaylistId && (
            <a
              href={`https://music.youtube.com/playlist?list=${mixtape.youtubePlaylistId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full md:w-auto px-8 py-4 bg-white/10 text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all border border-white/10 flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open in YT Music
            </a>
          )}

          {mixtape.spotifyPlaylistId && (
            <a
              href={`https://open.spotify.com/playlist/${mixtape.spotifyPlaylistId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full md:w-auto px-8 py-4 bg-green-500/20 text-green-400 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-green-500/30 transition-all border border-green-500/30 flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Spotify
            </a>
          )}

          <button
            onClick={handleCopy}
            className="w-full md:w-auto px-8 py-4 bg-white/5 text-gray-400 font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-white/10 hover:text-white transition-all border border-white/10 flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Link
              </>
            )}
          </button>

          <button
            onClick={handleShare}
            className="w-full md:w-auto px-8 py-4 bg-white/5 text-gray-400 font-bold text-sm uppercase tracking-widest rounded-xl hover:bg-white/10 hover:text-white transition-all border border-white/10 flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-24">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Generated with YTDJ.AI
          </p>
          <div className="flex items-center gap-6">
            <Link href="/discover" className="text-sm text-gray-600 hover:text-cyan-400 transition-colors">Discover</Link>
            <Link href="/privacy" className="text-sm text-gray-600 hover:text-cyan-400 transition-colors">Privacy</Link>
            <Link href="/terms" className="text-sm text-gray-600 hover:text-cyan-400 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
