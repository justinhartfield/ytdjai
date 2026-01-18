'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, ChevronUp, Volume2, VolumeX, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { formatTime } from '@/components/features/YouTubePlayer'

export function MobilePlayer() {
  const [isExpanded, setIsExpanded] = useState(false)
  const {
    currentSet,
    player,
    playTrack,
    pauseTrack,
    skipNext,
    skipPrevious,
    setPlayerState
  } = useYTDJStore()

  const playlist = currentSet?.playlist || []
  const { isPlaying, playingNodeIndex, currentTime, duration, volume, enrichingNodeIndex } = player
  const isEnriching = enrichingNodeIndex !== null
  const currentTrack = playingNodeIndex !== null ? playlist[playingNodeIndex] : null

  if (!currentTrack) {
    return null
  }

  return (
    <>
      {/* Minimized Player Bar */}
      {!isExpanded && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0c1c]/95 backdrop-blur-xl border-t border-white/10"
          onClick={() => setIsExpanded(true)}
        >
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-pink-500"
              style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>

          <div className="flex items-center gap-3 p-3">
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
              <img
                src={currentTrack.track.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop'}
                alt={currentTrack.track.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-white truncate">{currentTrack.track.title}</h4>
              <p className="text-xs text-gray-400 truncate">{currentTrack.track.artist}</p>
            </div>

            {/* Play/Pause Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (isEnriching) return
                isPlaying ? pauseTrack() : playTrack(playingNodeIndex!)
              }}
              disabled={isEnriching}
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-80"
            >
              {isEnriching ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>

            {/* Expand Icon */}
            <ChevronUp className="w-5 h-5 text-gray-400" />
          </div>
        </motion.div>
      )}

      {/* Expanded Player */}
      {isExpanded && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          className="fixed inset-0 z-50 bg-[#05060f] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <button
              onClick={() => setIsExpanded(false)}
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"
            >
              <ChevronUp className="w-5 h-5 text-white rotate-180" />
            </button>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Now Playing</h3>
            <div className="w-10" />
          </div>

          {/* Album Art */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="relative w-full max-w-md aspect-square">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-pink-500/20 rounded-3xl blur-3xl" />
              <img
                src={currentTrack.track.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop'}
                alt={currentTrack.track.title}
                className="relative w-full h-full object-cover rounded-3xl border border-white/10 shadow-2xl"
              />
            </div>
          </div>

          {/* Track Info */}
          <div className="px-8 pb-4">
            <h2 className="text-2xl font-black text-white mb-1">{currentTrack.track.title}</h2>
            <p className="text-lg text-cyan-400 font-bold">{currentTrack.track.artist}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs font-mono text-gray-500">
                Energy: {currentTrack.track.energy || '?'}
              </span>
              <span className="text-xs font-mono text-gray-500">
                {currentTrack.track.key || 'Unknown Key'}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-8 pb-4">
            <div
              className="h-2 bg-white/5 rounded-full relative overflow-hidden cursor-pointer"
              onClick={(e) => {
                if (duration > 0) {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const percent = (e.clientX - rect.left) / rect.width
                  setPlayerState({ currentTime: percent * duration })
                }
              }}
            >
              <div
                className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-cyan-500 to-pink-500"
                style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
              />
            </div>
            <div className="flex justify-between text-xs font-mono text-gray-500 mt-2">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="px-8 pb-8">
            <div className="flex items-center justify-center gap-6 mb-6">
              <button
                onClick={skipPrevious}
                disabled={isEnriching || playingNodeIndex === null || playingNodeIndex <= 0}
                className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center disabled:opacity-30"
              >
                <SkipBack className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={() => {
                  if (isEnriching) return
                  isPlaying ? pauseTrack() : playTrack(playingNodeIndex!)
                }}
                disabled={isEnriching}
                className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] disabled:opacity-80"
              >
                {isEnriching ? (
                  <Loader2 className="w-10 h-10 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-10 h-10" />
                ) : (
                  <Play className="w-10 h-10 ml-1" />
                )}
              </button>
              <button
                onClick={skipNext}
                disabled={isEnriching || playingNodeIndex === null || playingNodeIndex >= playlist.length - 1}
                className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center disabled:opacity-30"
              >
                <SkipForward className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPlayerState({ volume: volume > 0 ? 0 : 80 })}
                className="text-gray-500"
              >
                {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setPlayerState({ volume: parseInt(e.target.value) })}
                className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-cyan-500"
              />
              <span className="text-xs font-mono text-gray-500 w-8 text-right">{volume}</span>
            </div>
          </div>
        </motion.div>
      )}
    </>
  )
}
