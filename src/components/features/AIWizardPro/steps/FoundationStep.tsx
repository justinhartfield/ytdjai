'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  ListMusic,
  Anchor,
  Link,
  Plus,
  X,
  Search,
  Music,
  Pin,
  Check,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { WizardStep } from '../WizardStep'
import type { AnchorTrack } from '@/types'

type FoundationType = 'fresh' | 'playlist' | 'anchors'

interface YouTubeSearchResult {
  videoId: string
  title: string
  artist: string
  thumbnail: string
  channelTitle: string
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function FoundationStep() {
  const {
    generationControls,
    setSimilarPlaylist,
    addAnchorTrack,
    removeAnchorTrack
  } = useYTDJStore()

  const [selectedType, setSelectedType] = useState<FoundationType>(() => {
    if (generationControls.similarPlaylist?.url) return 'playlist'
    if (generationControls.anchorTracks.length > 0) return 'anchors'
    return 'fresh'
  })

  const [urlInput, setUrlInput] = useState(generationControls.similarPlaylist?.url || '')
  const [modifierInput, setModifierInput] = useState(generationControls.similarPlaylist?.modifier || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebounce(searchQuery, 300)

  // Search YouTube when debounced query changes
  useEffect(() => {
    const searchYouTube = async () => {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        setSearchResults([])
        setShowResults(false)
        return
      }

      setIsSearching(true)
      try {
        const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(debouncedQuery)}&limit=5`)
        const data = await response.json()

        if (data.success && data.results) {
          setSearchResults(data.results)
          setShowResults(true)
        } else {
          setSearchResults([])
        }
      } catch (error) {
        console.error('[YouTube Search] Error:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    searchYouTube()
  }, [debouncedQuery])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSetPlaylist = () => {
    if (urlInput.trim()) {
      setSimilarPlaylist({
        url: urlInput.trim(),
        modifier: modifierInput.trim() || undefined
      })
    }
  }

  const handleSelectTrack = (result: YouTubeSearchResult) => {
    if (generationControls.anchorTracks.length >= 5) return

    const track: AnchorTrack = {
      id: `yt-${result.videoId}`,
      title: result.title,
      artist: result.artist,
      youtubeId: result.videoId,
      thumbnail: result.thumbnail
    }
    addAnchorTrack(track)
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
  }

  const handleQuickAddTrack = () => {
    if (!searchQuery.trim() || generationControls.anchorTracks.length >= 5) return
    const quickTrack: AnchorTrack = {
      id: `quick-${Date.now()}`,
      title: searchQuery.trim(),
      artist: 'Unknown Artist'
    }
    addAnchorTrack(quickTrack)
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
  }

  const options = [
    {
      id: 'fresh' as FoundationType,
      icon: <Sparkles className="w-5 h-5" />,
      title: 'Start Fresh',
      description: 'Build from your prompt alone',
      color: 'cyan'
    },
    {
      id: 'playlist' as FoundationType,
      icon: <ListMusic className="w-5 h-5" />,
      title: 'Based on Playlist',
      description: 'Use an existing playlist as inspiration',
      color: 'emerald'
    },
    {
      id: 'anchors' as FoundationType,
      icon: <Anchor className="w-5 h-5" />,
      title: 'Anchor Songs',
      description: 'Must include specific tracks',
      color: 'amber'
    }
  ]

  return (
    <WizardStep
      title="What's your starting point?"
      subtitle="Choose how you want to build your playlist"
    >
      {/* Option Cards */}
      <div className="grid gap-3">
        {options.map((option) => {
          const isSelected = selectedType === option.id
          const colorClasses = {
            cyan: isSelected ? 'bg-cyan-500/20 border-cyan-500/50' : '',
            emerald: isSelected ? 'bg-emerald-500/20 border-emerald-500/50' : '',
            amber: isSelected ? 'bg-amber-500/20 border-amber-500/50' : ''
          }
          const iconColorClasses = {
            cyan: isSelected ? 'text-cyan-400' : 'text-white/40',
            emerald: isSelected ? 'text-emerald-400' : 'text-white/40',
            amber: isSelected ? 'text-amber-400' : 'text-white/40'
          }

          return (
            <motion.button
              key={option.id}
              onClick={() => setSelectedType(option.id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={cn(
                'flex items-center gap-4 p-4 rounded-xl border transition-all text-left',
                isSelected
                  ? colorClasses[option.color as keyof typeof colorClasses]
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              )}
            >
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                isSelected ? `bg-${option.color}-500/20` : 'bg-white/10'
              )}>
                <span className={iconColorClasses[option.color as keyof typeof iconColorClasses]}>
                  {option.icon}
                </span>
              </div>
              <div className="flex-1">
                <h3 className={cn(
                  'font-bold',
                  isSelected ? 'text-white' : 'text-white/80'
                )}>
                  {option.title}
                </h3>
                <p className="text-sm text-white/50">{option.description}</p>
              </div>
              {isSelected && (
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center',
                  option.color === 'cyan' && 'bg-cyan-500',
                  option.color === 'emerald' && 'bg-emerald-500',
                  option.color === 'amber' && 'bg-amber-500'
                )}>
                  <Check className="w-4 h-4 text-black" />
                </div>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Playlist URL Input (shown when playlist selected) */}
      {selectedType === 'playlist' && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="space-y-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl"
        >
          <div className="space-y-2">
            <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <Link className="w-3 h-3" />
              Playlist URL
            </label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onBlur={handleSetPlaylist}
              placeholder="Paste Spotify or YouTube playlist URL..."
              className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider">
              Your Twist (optional)
            </label>
            <input
              type="text"
              value={modifierInput}
              onChange={(e) => setModifierInput(e.target.value)}
              onBlur={handleSetPlaylist}
              placeholder='e.g. "but more energetic" or "with a darker vibe"'
              className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <p className="text-xs text-white/30">
            Supports Spotify, YouTube, and YouTube Music playlists
          </p>
        </motion.div>
      )}

      {/* Anchor Tracks Input (shown when anchors selected) */}
      {selectedType === 'anchors' && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="space-y-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl"
        >
          {/* Current anchors */}
          {generationControls.anchorTracks.length > 0 && (
            <div className="space-y-2">
              {generationControls.anchorTracks.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg group"
                >
                  <Pin className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  {track.thumbnail ? (
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Music className="w-4 h-4 text-amber-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{track.title}</p>
                    <p className="text-xs text-white/50 truncate">{track.artist}</p>
                  </div>
                  <button
                    onClick={() => removeAnchorTrack(track.id)}
                    className="opacity-0 group-hover:opacity-100 text-amber-400 hover:text-amber-300 transition-all p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search input with autocomplete */}
          {generationControls.anchorTracks.length < 5 && (
            <div ref={searchRef} className="relative">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchResults.length > 0 && setShowResults(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !showResults) {
                        handleQuickAddTrack()
                      } else if (e.key === 'Escape') {
                        setShowResults(false)
                      }
                    }}
                    placeholder="Search for a song on YouTube..."
                    className="w-full px-4 py-3 pl-10 bg-black/50 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                  />
                  {isSearching ? (
                    <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 animate-spin" />
                  ) : (
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  )}
                </div>
                <button
                  onClick={handleQuickAddTrack}
                  disabled={!searchQuery.trim()}
                  title="Add as custom track"
                  className="px-4 py-3 bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-[#0a0c1c] border border-amber-500/30 rounded-lg shadow-xl overflow-hidden">
                  {searchResults.map((result) => (
                    <button
                      key={result.videoId}
                      onClick={() => handleSelectTrack(result)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-amber-500/10 transition-colors text-left"
                    >
                      <img
                        src={result.thumbnail}
                        alt={result.title}
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{result.title}</p>
                        <p className="text-xs text-white/50 truncate">{result.artist}</p>
                      </div>
                      <Plus className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-white/30">
            {generationControls.anchorTracks.length}/5 tracks - AI will build your set around these
          </p>
        </motion.div>
      )}
    </WizardStep>
  )
}
