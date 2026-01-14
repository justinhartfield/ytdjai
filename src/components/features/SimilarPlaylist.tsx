'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ListMusic,
  Link,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'

interface SimilarPlaylistProps {
  className?: string
}

export function SimilarPlaylist({ className }: SimilarPlaylistProps) {
  const { generationControls, setSimilarPlaylist } = useYTDJStore()

  const [isExpanded, setIsExpanded] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [modifierInput, setModifierInput] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)

  const { similarPlaylist } = generationControls

  const validatePlaylistUrl = (url: string): boolean => {
    // Basic URL validation for Spotify and YouTube playlist URLs
    const spotifyPattern = /^https?:\/\/(open\.)?spotify\.com\/(playlist|user\/[^/]+\/playlist)\/[a-zA-Z0-9]+/
    const youtubePattern = /^https?:\/\/(www\.)?(youtube\.com\/playlist\?list=|music\.youtube\.com\/playlist\?list=)[a-zA-Z0-9_-]+/

    return spotifyPattern.test(url) || youtubePattern.test(url)
  }

  const handleSetPlaylist = async () => {
    if (!urlInput.trim()) return

    setIsValidating(true)
    setUrlError(null)

    // Simulate validation delay
    await new Promise(resolve => setTimeout(resolve, 300))

    if (!validatePlaylistUrl(urlInput.trim())) {
      setUrlError('Please enter a valid Spotify or YouTube playlist URL')
      setIsValidating(false)
      return
    }

    setSimilarPlaylist({
      url: urlInput.trim(),
      modifier: modifierInput.trim() || undefined
    })

    setIsValidating(false)
  }

  const handleClear = () => {
    setSimilarPlaylist(null)
    setUrlInput('')
    setModifierInput('')
    setUrlError(null)
  }

  const handleUpdateModifier = () => {
    if (similarPlaylist) {
      setSimilarPlaylist({
        ...similarPlaylist,
        modifier: modifierInput.trim() || undefined
      })
    }
  }

  return (
    <div className={cn('bg-[#0a0c1c]/80 backdrop-blur-xl rounded-xl border border-white/10', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <ListMusic className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-wider text-white">
              SIMILAR TO PLAYLIST
            </h3>
            <p className="text-[10px] text-white/40">
              {similarPlaylist?.url
                ? 'Reference playlist set'
                : 'Generate based on existing playlist'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {similarPlaylist?.url && (
            <span className="text-[10px] font-bold text-emerald-400">
              SET
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-white/40" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/40" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Info text */}
              <p className="text-[10px] text-white/30 italic">
                Paste a Spotify or YouTube playlist URL and add your twist
              </p>

              {/* Current playlist reference (if set) */}
              {similarPlaylist?.url ? (
                <div className="space-y-3">
                  {/* URL display */}
                  <div className="flex items-start gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Link className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-emerald-400 font-medium mb-1">Reference Playlist</p>
                      <p className="text-[10px] text-white/60 truncate break-all">
                        {similarPlaylist.url}
                      </p>
                      {similarPlaylist.modifier && (
                        <p className="text-xs text-white mt-2 italic">
                          + "{similarPlaylist.modifier}"
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleClear}
                      className="text-emerald-400 hover:text-emerald-300 transition-colors p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Modifier editor */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-3 h-3" />
                      Your Twist (optional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={modifierInput || similarPlaylist.modifier || ''}
                        onChange={(e) => setModifierInput(e.target.value)}
                        onBlur={handleUpdateModifier}
                        placeholder='e.g. "but more sunrise hope"'
                        className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <p className="text-[9px] text-white/20">
                      Add a phrase to shift the vibe from the original
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* URL input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
                      <Link className="w-3 h-3" />
                      Playlist URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => {
                          setUrlInput(e.target.value)
                          setUrlError(null)
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSetPlaylist()}
                        placeholder="Paste Spotify or YouTube playlist URL..."
                        className={cn(
                          'flex-1 px-3 py-2 bg-black/50 border rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none',
                          urlError
                            ? 'border-red-500/50 focus:border-red-500/50'
                            : 'border-white/10 focus:border-emerald-500/50'
                        )}
                      />
                    </div>
                    {urlError && (
                      <p className="text-[10px] text-red-400">{urlError}</p>
                    )}
                  </div>

                  {/* Modifier input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-3 h-3" />
                      Add Your Twist (optional)
                    </label>
                    <input
                      type="text"
                      value={modifierInput}
                      onChange={(e) => setModifierInput(e.target.value)}
                      placeholder='e.g. "but more energetic" or "with a darker vibe"'
                      className="w-full px-3 py-2 bg-black/50 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                    />
                    <p className="text-[9px] text-white/20">
                      Example: "Like this playlist, but more 'sunrise hope'"
                    </p>
                  </div>

                  {/* Set button */}
                  <button
                    onClick={handleSetPlaylist}
                    disabled={!urlInput.trim() || isValidating}
                    className="w-full py-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-bold uppercase tracking-wider hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isValidating ? (
                      <>
                        <div className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        Set Reference Playlist
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Supported platforms */}
              <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                <p className="text-[9px] text-white/30">Supported:</p>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-white/40">Spotify</span>
                  <span className="text-[10px] text-white/40">YouTube Music</span>
                  <span className="text-[10px] text-white/40">YouTube</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
