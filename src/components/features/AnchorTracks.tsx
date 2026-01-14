'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Anchor,
  Plus,
  X,
  Search,
  Music,
  ChevronDown,
  ChevronUp,
  Pin
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import type { AnchorTrack } from '@/types'

interface AnchorTracksProps {
  className?: string
}

export function AnchorTracks({ className }: AnchorTracksProps) {
  const { generationControls, addAnchorTrack, removeAnchorTrack } = useYTDJStore()

  const [isExpanded, setIsExpanded] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<AnchorTrack[]>([])

  const maxTracks = 5
  const canAddMore = generationControls.anchorTracks.length < maxTracks

  // Simulated search - in production this would call YouTube/Spotify API
  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))

    // Mock search results - in production, this would be real API results
    const mockResults: AnchorTrack[] = [
      {
        id: `search-${Date.now()}-1`,
        title: searchQuery,
        artist: 'Artist Name',
        youtubeId: 'dQw4w9WgXcQ',
        thumbnail: '/api/placeholder/48/48'
      },
      {
        id: `search-${Date.now()}-2`,
        title: `${searchQuery} (Remix)`,
        artist: 'Another Artist',
        youtubeId: 'dQw4w9WgXcQ',
        thumbnail: '/api/placeholder/48/48'
      },
      {
        id: `search-${Date.now()}-3`,
        title: `${searchQuery} - Live Version`,
        artist: 'Live Artist',
        youtubeId: 'dQw4w9WgXcQ',
        thumbnail: '/api/placeholder/48/48'
      }
    ]

    setSearchResults(mockResults)
    setIsSearching(false)
  }

  const handleAddTrack = (track: AnchorTrack) => {
    if (canAddMore) {
      addAnchorTrack(track)
      setSearchResults([])
      setSearchQuery('')
    }
  }

  const handleQuickAdd = () => {
    if (!searchQuery.trim() || !canAddMore) return

    // Quick add without search - user just types title/artist
    const quickTrack: AnchorTrack = {
      id: `quick-${Date.now()}`,
      title: searchQuery.trim(),
      artist: 'Unknown Artist'
    }
    addAnchorTrack(quickTrack)
    setSearchQuery('')
  }

  return (
    <div className={cn('bg-[#0a0c1c]/80 backdrop-blur-xl rounded-xl border border-white/10', className)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Anchor className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-wider text-white">
              ANCHOR TRACKS
            </h3>
            <p className="text-[10px] text-white/40">
              {generationControls.anchorTracks.length > 0
                ? `${generationControls.anchorTracks.length}/${maxTracks} guaranteed includes`
                : 'Pin 1-5 tracks to always include'}
            </p>
          </div>
        </div>
        {generationControls.anchorTracks.length > 0 && (
          <span className="text-[10px] font-bold text-amber-400 mr-2">
            {generationControls.anchorTracks.length}
          </span>
        )}
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" />
        )}
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
            <div className="px-4 pb-4 space-y-3">
              {/* Info text */}
              <p className="text-[10px] text-white/30 italic">
                These tracks will be included in your set - AI fills around them
              </p>

              {/* Current anchor tracks */}
              {generationControls.anchorTracks.length > 0 && (
                <div className="space-y-2">
                  {generationControls.anchorTracks.map((track, index) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-3 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg group"
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded bg-amber-500/20">
                        <Pin className="w-3 h-3 text-amber-400" />
                      </div>
                      {track.thumbnail ? (
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-amber-500/20 flex items-center justify-center">
                          <Music className="w-4 h-4 text-amber-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">
                          {track.title}
                        </p>
                        <p className="text-xs text-white/50 truncate">
                          {track.artist}
                        </p>
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

              {/* Add track input */}
              {canAddMore && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (e.shiftKey) {
                              handleQuickAdd()
                            } else {
                              handleSearch()
                            }
                          }
                        }}
                        placeholder="Search for a track or type title..."
                        className="w-full px-3 py-2 pl-9 bg-black/50 border border-white/10 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                      />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    </div>
                    <button
                      onClick={handleSearch}
                      disabled={!searchQuery.trim() || isSearching}
                      className="px-3 py-2 bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSearching ? (
                        <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={handleQuickAdd}
                      disabled={!searchQuery.trim()}
                      className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Quick add (Shift+Enter)"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[9px] text-white/20">
                    Press Enter to search, Shift+Enter to quick add
                  </p>
                </div>
              )}

              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">
                    Search Results
                  </p>
                  {searchResults.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => handleAddTrack(track)}
                      disabled={!canAddMore}
                      className="w-full flex items-center gap-3 p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {track.thumbnail ? (
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
                          <Music className="w-3.5 h-3.5 text-white/40" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm text-white truncate">{track.title}</p>
                        <p className="text-xs text-white/40 truncate">{track.artist}</p>
                      </div>
                      <Plus className="w-4 h-4 text-amber-400" />
                    </button>
                  ))}
                </div>
              )}

              {/* Max reached notice */}
              {!canAddMore && (
                <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg">
                  <Pin className="w-4 h-4 text-white/40" />
                  <p className="text-xs text-white/40">
                    Maximum {maxTracks} anchor tracks reached
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
