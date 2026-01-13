'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Play, Clock, Zap, Music2, ExternalLink, Copy, Check, Share2 } from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'

interface SharePageProps {
  params: Promise<{ id: string }>
}

// Mock data for demo - in production this would come from an API
const mockSetData = {
  id: 'demo-set',
  name: 'Summer Beach Vibes',
  prompt: 'Upbeat progressive house set for a beach party with tropical influences',
  createdAt: new Date(),
  playlist: [
    { id: '1', track: { id: 't1', youtubeId: 'abc123', title: 'Levels', artist: 'Avicii', energy: 85, duration: 204, thumbnail: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop' }, targetEnergy: 85 },
    { id: '2', track: { id: 't2', youtubeId: 'def456', title: 'Strobe', artist: 'deadmau5', energy: 70, duration: 612, thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop' }, targetEnergy: 70 },
    { id: '3', track: { id: 't3', youtubeId: 'ghi789', title: 'Opus', artist: 'Eric Prydz', energy: 80, duration: 540, thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop' }, targetEnergy: 80 },
    { id: '4', track: { id: 't4', youtubeId: 'jkl012', title: 'Ghosts n Stuff', artist: 'deadmau5', energy: 75, duration: 294, thumbnail: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=100&h=100&fit=crop' }, targetEnergy: 75 },
    { id: '5', track: { id: 't5', youtubeId: 'mno345', title: 'Language', artist: 'Porter Robinson', energy: 90, duration: 375, thumbnail: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=100&h=100&fit=crop' }, targetEnergy: 90 },
    { id: '6', track: { id: 't6', youtubeId: 'pqr678', title: 'Midnight City', artist: 'M83', energy: 65, duration: 243, thumbnail: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=100&h=100&fit=crop' }, targetEnergy: 65 },
  ]
}

export default function SharePage({ params }: SharePageProps) {
  const [copied, setCopied] = useState(false)
  const [setData] = useState(mockSetData)
  const [shareId, setShareId] = useState<string | null>(null)

  useEffect(() => {
    params.then(p => setShareId(p.id))
  }, [params])

  const stats = useMemo(() => {
    const playlist = setData.playlist
    const duration = playlist.reduce((acc, n) => acc + (n.track?.duration || 0), 0)
    const energies = playlist.map(n => n.targetEnergy || n.track?.energy || 50)

    return {
      duration,
      trackCount: playlist.length,
      energyRange: { min: Math.min(...energies), max: Math.max(...energies) },
      peakEnergy: Math.max(...energies)
    }
  }, [setData])

  // Generate curve path for the DNA visualization
  const curvePath = useMemo(() => {
    const playlist = setData.playlist
    if (playlist.length < 2) return ''

    const points = playlist.map((node, index) => {
      const x = ((index + 1) / (playlist.length + 1)) * 100
      const energy = node.targetEnergy || node.track?.energy || 50
      // Map energy (1-100) to Y position (higher energy = higher on screen)
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
  }, [setData])

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#05060f] text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-cyan-500/5 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-pink-500/5 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-cyan-500 to-pink-500 flex items-center justify-center font-black text-black text-sm">YT</div>
            <span className="text-lg font-extrabold tracking-tighter uppercase">YTDJ<span className="text-cyan-400">.AI</span></span>
          </div>
          <a
            href="/"
            className="px-4 py-2 bg-cyan-500 text-black text-xs font-black uppercase tracking-widest rounded-lg hover:bg-cyan-400 transition-all"
          >
            Create Your Own
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-4">
              {setData.name}
            </h1>
            {setData.prompt && (
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                {setData.prompt}
              </p>
            )}
          </motion.div>
        </section>

        {/* DNA Curve Visualization */}
        <motion.section
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-16 p-8 bg-white/5 border border-white/10 rounded-3xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              Energy Arc
            </h2>
            <div className="flex items-center gap-4 text-[10px] font-bold text-gray-600 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-cyan-500" /> Energy (1-100)
              </span>
            </div>
          </div>

          <div className="relative h-32 overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="shareGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00f2ff" />
                  <stop offset="50%" stopColor="#ff00e5" />
                  <stop offset="100%" stopColor="#00f2ff" />
                </linearGradient>
              </defs>
              <path
                d={curvePath}
                fill="none"
                stroke="url(#shareGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                className="drop-shadow-[0_0_10px_rgba(0,242,255,0.5)]"
              />
              {/* Track markers */}
              {setData.playlist.map((node, index) => {
                const x = ((index + 1) / (setData.playlist.length + 1)) * 100
                const energy = node.targetEnergy || node.track?.energy || 50
                const y = 90 - ((energy - 1) / 99) * 80
                return (
                  <circle
                    key={node.id}
                    cx={x}
                    cy={Math.max(10, Math.min(90, y))}
                    r="3"
                    fill="#00f2ff"
                    className="drop-shadow-[0_0_5px_rgba(0,242,255,0.8)]"
                  />
                )
              })}
            </svg>
          </div>
        </motion.section>

        {/* Stats */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
        >
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center">
            <Clock className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
            <div className="text-2xl font-black text-white">{formatDuration(stats.duration)}</div>
            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Duration</div>
          </div>
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center">
            <Zap className="w-6 h-6 text-pink-400 mx-auto mb-2" />
            <div className="text-2xl font-black text-white">{stats.energyRange.min}-{stats.energyRange.max}</div>
            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Energy Range</div>
          </div>
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center">
            <Music2 className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-black text-white">{stats.trackCount}</div>
            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Tracks</div>
          </div>
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center">
            <Zap className="w-6 h-6 text-orange-400 mx-auto mb-2" />
            <div className="text-2xl font-black text-white">{Math.round(stats.peakEnergy * 100)}%</div>
            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Peak Energy</div>
          </div>
        </motion.section>

        {/* Tracklist */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-16"
        >
          <h2 className="text-lg font-black uppercase tracking-wider mb-6">Tracklist</h2>
          <div className="space-y-2">
            {setData.playlist.map((node, index) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.05 }}
                className="group flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20 transition-all"
              >
                <div className="w-8 text-center text-sm font-mono text-gray-600">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/50 relative">
                  <img
                    src={node.track.thumbnail}
                    alt={node.track.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">{node.track.title}</div>
                  <div className="text-sm text-gray-500 truncate">{node.track.artist}</div>
                </div>
                <div className="text-sm font-mono text-cyan-400">
                  Energy: {node.track.energy}
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
          <a
            href="/"
            className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-cyan-500 to-pink-500 text-black font-black text-sm uppercase tracking-widest rounded-xl hover:opacity-90 transition-all text-center"
          >
            Remix This Set
          </a>
          <a
            href="https://music.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full md:w-auto px-8 py-4 bg-white/10 text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all border border-white/10 flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Open in YT Music
          </a>
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
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-24">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Generated with YTDJ.AI
          </p>
          <div className="flex items-center gap-4">
            <button className="text-gray-600 hover:text-white transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
