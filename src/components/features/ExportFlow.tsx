'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Check, Copy, ExternalLink, Share2, Twitter, Music2, Youtube,
  Loader2, Sparkles, Globe, Lock, Link as LinkIcon
} from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import { useYTDJStore } from '@/store'

interface ExportFlowProps {
  isOpen: boolean
  onClose: () => void
}

type ExportStep = 'metadata' | 'settings' | 'progress' | 'success'
type Visibility = 'public' | 'unlisted' | 'private'
type Destination = 'youtube-music' | 'youtube'

interface ExportState {
  name: string
  description: string
  visibility: Visibility
  destination: Destination
  playlistUrl?: string
  shareUrl?: string
}

export function ExportFlow({ isOpen, onClose }: ExportFlowProps) {
  const { currentSet } = useYTDJStore()
  const playlist = currentSet?.playlist || []

  const [step, setStep] = useState<ExportStep>('metadata')
  const [exportState, setExportState] = useState<ExportState>({
    name: currentSet?.name || 'My DJ Set',
    description: '',
    visibility: 'unlisted',
    destination: 'youtube-music'
  })
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [copied, setCopied] = useState(false)

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setStep('metadata')
      setExportState({
        name: currentSet?.name || 'My DJ Set',
        description: generateDescription(),
        visibility: 'unlisted',
        destination: 'youtube-music'
      })
      setProgress(0)
    }
  }, [isOpen, currentSet])

  const generateDescription = () => {
    const trackCount = playlist.length
    const duration = playlist.reduce((acc, n) => acc + (n.track?.duration || 0), 0)
    const bpms = playlist.map(n => n.targetBpm || n.track?.bpm || 120)
    const minBpm = Math.min(...bpms)
    const maxBpm = Math.max(...bpms)

    return `AI-curated DJ set with ${trackCount} tracks | ${formatDuration(duration)} | ${minBpm}-${maxBpm} BPM\n\nGenerated with YTDJ.AI`
  }

  const handleExport = async () => {
    setStep('progress')
    setProgress(0)

    // Simulate export progress
    const steps = [
      { progress: 10, message: 'Validating tracks...' },
      { progress: 30, message: 'Generating metadata...' },
      { progress: 50, message: 'Creating playlist...' },
      { progress: 70, message: 'Adding tracks...' },
      { progress: 90, message: 'Finalizing...' },
      { progress: 100, message: 'Complete!' }
    ]

    for (const s of steps) {
      await new Promise(resolve => setTimeout(resolve, 800))
      setProgress(s.progress)
      setProgressMessage(s.message)
    }

    // Generate fake URLs for demo
    const playlistId = `PL${Date.now().toString(36)}`
    const shareId = `share-${Date.now().toString(36)}`

    setExportState(prev => ({
      ...prev,
      playlistUrl: `https://music.youtube.com/playlist?list=${playlistId}`,
      shareUrl: `${window.location.origin}/share/${shareId}`
    }))

    await new Promise(resolve => setTimeout(resolve, 500))
    setStep('success')
  }

  const handleCopyLink = () => {
    if (exportState.shareUrl) {
      navigator.clipboard.writeText(exportState.shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const visibilityOptions = [
    { id: 'public' as Visibility, label: 'Public', icon: Globe, desc: 'Anyone can find and view' },
    { id: 'unlisted' as Visibility, label: 'Unlisted', icon: LinkIcon, desc: 'Only people with link' },
    { id: 'private' as Visibility, label: 'Private', icon: Lock, desc: 'Only you can view' }
  ]

  const totalDuration = playlist.reduce((acc, n) => acc + (n.track?.duration || 0), 0)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
        >
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-[#0a0c1c] border border-white/10 max-w-lg w-full rounded-3xl overflow-hidden"
          >
            {/* Decorative glow */}
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-cyan-500/10 blur-[100px]" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-pink-500/10 blur-[100px]" />

            {/* Header */}
            <div className="relative p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tighter uppercase">
                  {step === 'success' ? 'Export Complete' : 'Export Set'}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {playlist.length} tracks • {formatDuration(totalDuration)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="relative p-6">
              {/* Metadata Step */}
              {step === 'metadata' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      Playlist Name
                    </label>
                    <input
                      type="text"
                      value={exportState.name}
                      onChange={(e) => setExportState(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white font-bold focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        Description
                      </label>
                      <button
                        onClick={() => setExportState(prev => ({ ...prev, description: generateDescription() }))}
                        className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        AI Rewrite
                      </button>
                    </div>
                    <textarea
                      value={exportState.description}
                      onChange={(e) => setExportState(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white text-sm resize-none focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  <button
                    onClick={() => setStep('settings')}
                    disabled={!exportState.name.trim()}
                    className="w-full py-4 bg-cyan-500 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </motion.div>
              )}

              {/* Settings Step */}
              {step === 'settings' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  {/* Visibility */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      Visibility
                    </label>
                    <div className="space-y-2">
                      {visibilityOptions.map(({ id, label, icon: Icon, desc }) => (
                        <button
                          key={id}
                          onClick={() => setExportState(prev => ({ ...prev, visibility: id }))}
                          className={cn(
                            "w-full p-4 rounded-xl border transition-all flex items-center gap-4 text-left",
                            exportState.visibility === id
                              ? "bg-cyan-500/10 border-cyan-500/50"
                              : "bg-white/5 border-white/10 hover:border-white/20"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            exportState.visibility === id ? "bg-cyan-500/20" : "bg-white/5"
                          )}>
                            <Icon className={cn(
                              "w-5 h-5",
                              exportState.visibility === id ? "text-cyan-400" : "text-gray-500"
                            )} />
                          </div>
                          <div>
                            <div className="font-bold text-white">{label}</div>
                            <div className="text-[11px] text-gray-500">{desc}</div>
                          </div>
                          {exportState.visibility === id && (
                            <Check className="w-5 h-5 text-cyan-400 ml-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      Destination
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setExportState(prev => ({ ...prev, destination: 'youtube-music' }))}
                        className={cn(
                          "p-4 rounded-xl border transition-all flex flex-col items-center gap-2",
                          exportState.destination === 'youtube-music'
                            ? "bg-pink-500/10 border-pink-500/50"
                            : "bg-white/5 border-white/10 hover:border-white/20"
                        )}
                      >
                        <Music2 className={cn(
                          "w-8 h-8",
                          exportState.destination === 'youtube-music' ? "text-pink-400" : "text-gray-500"
                        )} />
                        <span className="text-xs font-bold">YT Music</span>
                      </button>
                      <button
                        onClick={() => setExportState(prev => ({ ...prev, destination: 'youtube' }))}
                        className={cn(
                          "p-4 rounded-xl border transition-all flex flex-col items-center gap-2",
                          exportState.destination === 'youtube'
                            ? "bg-red-500/10 border-red-500/50"
                            : "bg-white/5 border-white/10 hover:border-white/20"
                        )}
                      >
                        <Youtube className={cn(
                          "w-8 h-8",
                          exportState.destination === 'youtube' ? "text-red-400" : "text-gray-500"
                        )} />
                        <span className="text-xs font-bold">YouTube</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('metadata')}
                      className="flex-1 py-4 bg-white/5 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleExport}
                      className="flex-[2] py-4 bg-gradient-to-r from-cyan-500 to-pink-500 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-all"
                    >
                      Export to {exportState.destination === 'youtube-music' ? 'YT Music' : 'YouTube'}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Progress Step */}
              {step === 'progress' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-12 text-center space-y-8"
                >
                  <div className="relative mx-auto w-24 h-24">
                    <svg className="w-24 h-24 -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="8"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        fill="none"
                        stroke="url(#progressGradient)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * progress) / 100}
                        className="transition-all duration-500"
                      />
                      <defs>
                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#00f2ff" />
                          <stop offset="100%" stopColor="#ff00e5" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-black text-white">{progress}%</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-lg font-bold text-white">{progressMessage}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Creating your playlist on {exportState.destination === 'youtube-music' ? 'YouTube Music' : 'YouTube'}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Success Step */}
              {step === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-6 text-center space-y-6"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500 to-pink-500 flex items-center justify-center mx-auto">
                    <Check className="w-10 h-10 text-black" />
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-white">{exportState.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Successfully exported to {exportState.destination === 'youtube-music' ? 'YouTube Music' : 'YouTube'}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <a
                      href={exportState.playlistUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-4 bg-cyan-500 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-cyan-400 transition-all flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Playlist
                    </a>

                    <button
                      onClick={handleCopyLink}
                      className="w-full py-4 bg-white/5 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 border border-white/10"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-green-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Share Link
                        </>
                      )}
                    </button>
                  </div>

                  {/* Social Share */}
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">
                      Share on
                    </p>
                    <div className="flex justify-center gap-3">
                      <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-[#1DA1F2]/20 text-gray-500 hover:text-[#1DA1F2] flex items-center justify-center transition-all">
                        <Twitter className="w-5 h-5" />
                      </button>
                      <button className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white flex items-center justify-center transition-all">
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
