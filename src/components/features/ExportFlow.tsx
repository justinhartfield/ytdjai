'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Check, Copy, ExternalLink, Share2, Twitter, Music2, Youtube,
  Loader2, Sparkles, Globe, Lock, Link as LinkIcon, AlertCircle, LogIn
} from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'
import { useYTDJStore } from '@/store'

// Key for storing pending export state in sessionStorage
const PENDING_EXPORT_KEY = 'ytdj-pending-export'

interface ExportFlowProps {
  isOpen: boolean
  onClose: () => void
}

type ExportStep = 'auth' | 'metadata' | 'settings' | 'progress' | 'success' | 'error'
type Visibility = 'public' | 'unlisted' | 'private'
type Destination = 'youtube-music' | 'youtube' | 'spotify'

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

interface PendingExportState {
  exportState: ExportState
  timestamp: number
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
  const [resumedFromAuth, setResumedFromAuth] = useState(false)

  // Check for pending export on mount (returning from OAuth)
  useEffect(() => {
    if (status === 'authenticated' && !resumedFromAuth) {
      try {
        const pendingExportJson = sessionStorage.getItem(PENDING_EXPORT_KEY)
        if (pendingExportJson) {
          const pendingExport: PendingExportState = JSON.parse(pendingExportJson)
          // Only restore if saved within last 5 minutes
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
          if (pendingExport.timestamp > fiveMinutesAgo) {
            // Restore export state and proceed to metadata step
            setExportState(pendingExport.exportState)
            setStep('metadata')
            setResumedFromAuth(true)
            // Clear the pending export
            sessionStorage.removeItem(PENDING_EXPORT_KEY)
            return
          }
          // Clear stale pending export
          sessionStorage.removeItem(PENDING_EXPORT_KEY)
        }
      } catch (e) {
        console.error('[ExportFlow] Error restoring pending export:', e)
        sessionStorage.removeItem(PENDING_EXPORT_KEY)
      }
    }
  }, [status, resumedFromAuth])

  // Reset when opening
  useEffect(() => {
    if (isOpen && !resumedFromAuth) {
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
  }, [isOpen, currentSet, status, resumedFromAuth])

  const generateDescription = () => {
    const trackCount = playlist.length
    const duration = playlist.reduce((acc, n) => acc + (n.track?.duration || 0), 0)
    const energies = playlist.map(n => n.targetEnergy || n.track?.energy || 50)
    const minEnergy = Math.min(...energies)
    const maxEnergy = Math.max(...energies)

    return `AI-curated DJ set with ${trackCount} tracks | ${formatDuration(duration)} | Energy: ${minEnergy}-${maxEnergy}\n\nGenerated with YTDJ.AI`
  }

  const handleExport = async () => {
    setStep('progress')
    setProgress(0)
    setProgressMessage('Preparing export...')

    const isSpotifyExport = exportState.destination === 'spotify'

    try {
      // Initial progress
      setProgress(5)
      setProgressMessage('Validating tracks...')
      await new Promise(resolve => setTimeout(resolve, 300))

      // Collect all tracks
      const allTracks = playlist.map((node) => ({
        youtubeId: node.track?.youtubeId || '',
        title: node.track?.title || 'Unknown',
        artist: node.track?.artist || 'Unknown',
      }))

      // For Spotify export, we don't need YouTube IDs - just artist/title
      if (isSpotifyExport) {
        setProgress(20)
        setProgressMessage('Creating Spotify playlist...')

        const response = await fetch('/api/spotify/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: exportState.name,
            description: exportState.description,
            visibility: exportState.visibility === 'public' ? 'public' : 'private',
            tracks: allTracks.map(t => ({ artist: t.artist, title: t.title })),
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Spotify export failed')
        }

        setProgress(100)
        setProgressMessage('Complete!')

        setExportState(prev => ({
          ...prev,
          playlistUrl: data.playlistUrl,
          shareUrl: data.playlistUrl,
          addedCount: data.results?.added || 0,
          failedCount: data.results?.failed || 0,
        }))

        await new Promise(resolve => setTimeout(resolve, 500))
        setStep('success')
        return
      }

      // YouTube/YouTube Music export path
      // Separate tracks with and without YouTube IDs
      const tracksWithYoutubeId = allTracks.filter(t => t.youtubeId && !t.youtubeId.startsWith('yt-'))
      const tracksNeedingEnrichment = allTracks.filter(t => !t.youtubeId || t.youtubeId.startsWith('yt-'))

      console.log(`[Export] ${tracksWithYoutubeId.length} tracks have YouTube IDs, ${tracksNeedingEnrichment.length} need enrichment`)

      // Enrich tracks that don't have YouTube IDs using the video search API with YouTube fallback
      if (tracksNeedingEnrichment.length > 0) {
        setProgress(10)
        setProgressMessage(`Finding ${tracksNeedingEnrichment.length} tracks on YouTube...`)

        try {
          // Use the new video search API with YouTube enabled (export-time only)
          const response = await fetch('/api/video/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tracks: tracksNeedingEnrichment.map(t => ({ artist: t.artist, title: t.title })),
              useYouTube: true, // Only use YouTube API at export time
            }),
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success && data.tracks) {
              for (const enrichedTrack of data.tracks) {
                if (enrichedTrack.videoId) {
                  tracksWithYoutubeId.push({
                    youtubeId: enrichedTrack.videoId,
                    title: enrichedTrack.title,
                    artist: enrichedTrack.artist,
                  })
                }
              }
              setProgress(15)
              setProgressMessage(`Found ${data.stats?.withVideoId || 0} of ${tracksNeedingEnrichment.length} tracks...`)
            }
          }
        } catch (error) {
          console.error('[Export] Enrichment error:', error)
          // Continue with whatever tracks we have
        }
      }

      const tracks = tracksWithYoutubeId

      if (tracks.length === 0) {
        throw new Error('No valid tracks to export - could not find any tracks on YouTube')
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

  const handleSignIn = (provider: 'google' | 'spotify' = 'google') => {
    // Save current state to localStorage before OAuth redirect
    // This ensures the Zustand persist middleware has written the latest state
    const zustandStorage = localStorage.getItem('ytdj-ai-storage')
    if (zustandStorage) {
      // Force a re-save to ensure it's current
      localStorage.setItem('ytdj-ai-storage', zustandStorage)
    }

    // Save export state to sessionStorage so we can resume after OAuth
    const pendingExport: PendingExportState = {
      exportState: {
        ...exportState,
        name: exportState.name || currentSet?.name || 'My DJ Set',
        description: exportState.description || generateDescription(),
      },
      timestamp: Date.now(),
    }
    sessionStorage.setItem(PENDING_EXPORT_KEY, JSON.stringify(pendingExport))

    // Also save a flag to auto-open export modal on return
    sessionStorage.setItem('ytdj-auto-open-export', 'true')

    signIn(provider, { callbackUrl: window.location.href })
  }

  // Check if user needs to authenticate for the selected destination
  const needsAuth = () => {
    if (exportState.destination === 'spotify') {
      return !session?.spotifyAccessToken
    }
    return status === 'unauthenticated' || !session?.accessToken
  }

  // Get the required provider for auth
  const getAuthProvider = (): 'google' | 'spotify' => {
    return exportState.destination === 'spotify' ? 'spotify' : 'google'
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
                    onClick={() => handleSignIn('google')}
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
                      <button
                        onClick={() => setExportState(prev => ({ ...prev, destination: 'spotify' }))}
                        className={cn(
                          "p-4 rounded-xl border transition-all flex flex-col items-center gap-2",
                          exportState.destination === 'spotify'
                            ? "bg-green-500/10 border-green-500/50"
                            : "bg-white/5 border-white/10 hover:border-white/20"
                        )}
                      >
                        <svg
                          className={cn(
                            "w-8 h-8",
                            exportState.destination === 'spotify' ? "text-green-400" : "text-gray-500"
                          )}
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                        </svg>
                        <span className="text-xs font-bold">Spotify</span>
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
                    {needsAuth() ? (
                      <button
                        onClick={() => handleSignIn(getAuthProvider())}
                        className={cn(
                          "flex-[2] py-4 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-all",
                          exportState.destination === 'spotify'
                            ? "bg-green-500"
                            : "bg-gradient-to-r from-cyan-500 to-pink-500"
                        )}
                      >
                        Sign in to {exportState.destination === 'spotify' ? 'Spotify' : 'Google'}
                      </button>
                    ) : (
                      <button
                        onClick={handleExport}
                        className={cn(
                          "flex-[2] py-4 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-90 transition-all",
                          exportState.destination === 'spotify'
                            ? "bg-green-500"
                            : "bg-gradient-to-r from-cyan-500 to-pink-500"
                        )}
                      >
                        Export to {exportState.destination === 'youtube-music' ? 'YT Music' : exportState.destination === 'spotify' ? 'Spotify' : 'YouTube'}
                      </button>
                    )}
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
                      Creating your playlist on {
                        exportState.destination === 'youtube-music' ? 'YouTube Music' :
                        exportState.destination === 'spotify' ? 'Spotify' : 'YouTube'
                      }
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

                  {/* Show re-auth button if scope issue */}
                  {exportState.error?.includes('insufficient authentication scopes') ? (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500">
                        YouTube access wasn&apos;t granted. Please sign out and sign in again to grant YouTube permissions.
                      </p>
                      <button
                        onClick={async () => {
                          await signOut({ redirect: false })
                          signIn('google', { callbackUrl: window.location.href })
                        }}
                        className="w-full py-4 bg-cyan-500 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-cyan-400 transition-all"
                      >
                        Sign Out & Re-authorize
                      </button>
                    </div>
                  ) : (
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
                  )}
                </motion.div>
              )}

              {/* Success Step */}
              {step === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-6 text-center space-y-6"
                >
                  <div className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center mx-auto",
                    exportState.destination === 'spotify'
                      ? "bg-green-500"
                      : "bg-gradient-to-tr from-cyan-500 to-pink-500"
                  )}>
                    <Check className="w-10 h-10 text-black" />
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-white">{exportState.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Successfully exported to {
                        exportState.destination === 'youtube-music' ? 'YouTube Music' :
                        exportState.destination === 'spotify' ? 'Spotify' : 'YouTube'
                      }
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
                      className={cn(
                        "w-full py-4 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2",
                        exportState.destination === 'spotify'
                          ? "bg-green-500 hover:bg-green-400"
                          : "bg-cyan-500 hover:bg-cyan-400"
                      )}
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
