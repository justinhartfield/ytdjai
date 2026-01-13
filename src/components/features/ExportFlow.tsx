'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Check, Copy, ExternalLink, Share2, Twitter, Music2, Youtube,
  Loader2, Sparkles, Globe, Lock, Link as LinkIcon, AlertCircle, LogIn
} from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import { useYTDJStore } from '@/store'

interface ExportFlowProps {
  isOpen: boolean
  onClose: () => void
}

type ExportStep = 'auth' | 'metadata' | 'settings' | 'progress' | 'success' | 'error'
type Visibility = 'public' | 'unlisted' | 'private'
type Destination = 'youtube-music' | 'youtube'

interface ExportState {
  name: string
  description: string
  visibility: Visibility
  destination: Destination
  playlistUrl?: string
  shareUrl?: string
  error?: string
  addedCount?: number
  failedCount?: number
}

export function ExportFlow({ isOpen, onClose }: ExportFlowProps) {
  const { data: session, status } = useSession()
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
      // Check auth status
      if (status === 'unauthenticated') {
        setStep('auth')
      } else {
        setStep('metadata')
      }
      setExportState({
        name: currentSet?.name || 'My DJ Set',
        description: generateDescription(),
        visibility: 'unlisted',
        destination: 'youtube-music'
      })
      setProgress(0)
    }
  }, [isOpen, currentSet, status])

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
    setProgressMessage('Preparing export...')

    try {
      // Initial progress
      setProgress(10)
      setProgressMessage('Validating tracks...')
      await new Promise(resolve => setTimeout(resolve, 300))

      // Prepare tracks data
      const tracks = playlist.map(node => ({
        youtubeId: node.track?.youtubeId || '',
        title: node.track?.title || 'Unknown',
        artist: node.track?.artist || 'Unknown'
      })).filter(t => t.youtubeId)

      if (tracks.length === 0) {
        throw new Error('No valid tracks to export')
      }

      setProgress(20)
      setProgressMessage('Creating playlist...')

      // Call the export API
      const response = await fetch('/api/youtube/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: exportState.name,
          description: exportState.description,
          visibility: exportState.visibility,
          tracks,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Export failed')
      }

      // Update progress based on tracks added
      setProgress(90)
      setProgressMessage('Finalizing...')
      await new Promise(resolve => setTimeout(resolve, 500))

      setProgress(100)
      setProgressMessage('Complete!')

      // Determine the correct URL based on destination
      let playlistUrl = data.playlistUrl
      if (exportState.destination === 'youtube-music') {
        // Convert YouTube URL to YouTube Music URL
        playlistUrl = playlistUrl.replace('www.youtube.com', 'music.youtube.com')
      }

      setExportState(prev => ({
        ...prev,
        playlistUrl,
        shareUrl: playlistUrl, // Use playlist URL as share link
        addedCount: data.results?.added || tracks.length,
        failedCount: data.results?.failed || 0,
      }))

      await new Promise(resolve => setTimeout(resolve, 500))
      setStep('success')
    } catch (error) {
      console.error('[Export] Error:', error)
      setExportState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Export failed'
      }))
      setStep('error')
    }
  }

  const handleCopyLink = () => {
    const linkToCopy = exportState.playlistUrl || exportState.shareUrl
    if (linkToCopy) {
      navigator.clipboard.writeText(linkToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSignIn = () => {
    signIn('google', { callbackUrl: window.location.href })
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
                  {step === 'success' ? 'Export Complete' : step === 'error' ? 'Export Failed' : step === 'auth' ? 'Sign In Required' : 'Export Set'}
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
              {/* Auth Step */}
              {step === 'auth' && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="py-8 text-center space-y-6"
                >
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                    <LogIn className="w-10 h-10 text-cyan-400" />
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-white">Connect Your Account</h3>
                    <p className="text-sm text-gray-500 mt-2">
                      Sign in with Google to export playlists directly to your YouTube account
                    </p>
                  </div>

                  <button
                    onClick={handleSignIn}
                    className="w-full py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-3"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                  </button>

                  <p className="text-[10px] text-gray-600">
                    We only request access to manage your YouTube playlists. Your data stays private.
                  </p>
                </motion.div>
              )}

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

              {/* Error Step */}
              {step === 'error' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-8 text-center space-y-6"
                >
                  <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-10 h-10 text-red-400" />
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-white">Export Failed</h3>
                    <p className="text-sm text-red-400 mt-2">
                      {exportState.error || 'An unexpected error occurred'}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('settings')}
                      className="flex-1 py-4 bg-white/5 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleExport}
                      className="flex-1 py-4 bg-cyan-500 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-cyan-400 transition-all"
                    >
                      Try Again
                    </button>
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
                    {exportState.failedCount !== undefined && exportState.failedCount > 0 && (
                      <p className="text-xs text-yellow-400 mt-2">
                        {exportState.addedCount} tracks added, {exportState.failedCount} failed (may be unavailable)
                      </p>
                    )}
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
                          Copy Playlist Link
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
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out my AI-curated DJ set: ${exportState.name}`)}&url=${encodeURIComponent(exportState.playlistUrl || '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-[#1DA1F2]/20 text-gray-500 hover:text-[#1DA1F2] flex items-center justify-center transition-all"
                      >
                        <Twitter className="w-5 h-5" />
                      </a>
                      <button
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: exportState.name,
                              text: `Check out my AI-curated DJ set`,
                              url: exportState.playlistUrl,
                            })
                          }
                        }}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white flex items-center justify-center transition-all"
                      >
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
