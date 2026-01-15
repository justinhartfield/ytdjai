'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Music, Disc3, X, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { haptics } from '@/lib/haptics'
import { formatTime } from '@/components/features/YouTubePlayer'

export function NowPlayingDeck() {
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
  const { isPlaying, playingNodeIndex, currentTime, duration, volume } = player
  const currentTrack = playingNodeIndex !== null ? playlist[playingNodeIndex] : null

  const handlePlayPause = () => {
    haptics.medium()
    if (isPlaying) {
      pauseTrack()
    } else if (playingNodeIndex !== null) {
      playTrack(playingNodeIndex)
    } else if (playlist.length > 0) {
      playTrack(0)
    }
  }

  const handleExpand = () => {
    haptics.light()
    setIsExpanded(true)
  }

  if (!currentTrack) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-3 text-center">
        <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-3">
          <Music className="w-7 h-7 text-white/20" />
        </div>
        <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
          Now Playing
        </span>
        <span className="text-[9px] text-white/20 mt-1">
          Select a track
        </span>
      </div>
    )
  }

  return (
    <>
      {/* Compact Deck */}
      <div className="h-full flex flex-col p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Now Playing</span>
          <span className="text-[9px] font-mono text-cyan-400">
            {String(playingNodeIndex! + 1).padStart(2, '0')}/{playlist.length}
          </span>
        </div>

        {/* Album Art with Vinyl Effect */}
        <div
          onClick={handleExpand}
          className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group mb-3"
        >
          <motion.div
            className="absolute inset-0"
            animate={isPlaying ? { rotate: 360 } : { rotate: 0 }}
            transition={isPlaying ? { duration: 8, repeat: Infinity, ease: 'linear' } : { duration: 0.5 }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-full rounded-xl overflow-hidden">
                <img
                  src={currentTrack.track.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=200&h=200&fit=crop'}
                  alt={currentTrack.track.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            {/* Vinyl center hole effect */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-4 h-4 rounded-full bg-[#05060f] border border-white/10" />
            </div>
          </motion.div>

          {/* Expand hint */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <span className="text-white/0 group-hover:text-white/80 text-[10px] font-bold uppercase tracking-wider transition-colors">
              Expand
            </span>
          </div>

          {/* Playing glow */}
          {isPlaying && (
            <motion.div
              className="absolute inset-0 rounded-xl"
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(0, 242, 255, 0)',
                  '0 0 20px 5px rgba(0, 242, 255, 0.3)',
                  '0 0 0 0 rgba(0, 242, 255, 0)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </div>

        {/* Track Info */}
        <div className="mb-3">
          <h3 className="text-xs font-bold text-white truncate leading-tight">
            {currentTrack.track.title}
          </h3>
          <p className="text-[10px] text-cyan-400/80 truncate">
            {currentTrack.track.artist}
          </p>
        </div>

        {/* Mini Progress */}
        <div className="mb-3">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-pink-500"
              style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>
          <div className="flex justify-between text-[8px] font-mono text-white/40 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Mini Controls */}
        <div className="flex items-center justify-center gap-2 mt-auto">
          <button
            onClick={(e) => {
              e.stopPropagation()
              haptics.light()
              skipPrevious()
            }}
            disabled={playingNodeIndex === null || playingNodeIndex <= 0}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center disabled:opacity-30"
          >
            <SkipBack className="w-3.5 h-3.5 text-white" />
          </button>

          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              handlePlayPause()
            }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center',
              isPlaying
                ? 'bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                : 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]'
            )}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </motion.button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              haptics.light()
              skipNext()
            }}
            disabled={playingNodeIndex === null || playingNodeIndex >= playlist.length - 1}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center disabled:opacity-30"
          >
            <SkipForward className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* Expanded Full-Screen Player */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#05060f]/98 backdrop-blur-xl"
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="h-full flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <button
                  onClick={() => {
                    haptics.light()
                    setIsExpanded(false)
                  }}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Now Playing</span>
                <div className="w-10" />
              </div>

              {/* Content */}
              <div className="flex-1 flex items-center p-6">
                {/* Large Album Art */}
                <div className="flex-shrink-0 w-[40vh] h-[40vh] max-w-[300px] max-h-[300px] mr-8">
                  <motion.div
                    className="w-full h-full rounded-3xl overflow-hidden relative"
                    animate={isPlaying ? { rotate: 360 } : {}}
                    transition={isPlaying ? { duration: 20, repeat: Infinity, ease: 'linear' } : {}}
                  >
                    <img
                      src={currentTrack.track.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop'}
                      alt={currentTrack.track.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-[#05060f] border-2 border-white/10" />
                    </div>
                    {isPlaying && (
                      <motion.div
                        className="absolute inset-0 rounded-3xl"
                        animate={{
                          boxShadow: [
                            '0 0 30px rgba(0, 242, 255, 0.2)',
                            '0 0 60px rgba(0, 242, 255, 0.4)',
                            '0 0 30px rgba(0, 242, 255, 0.2)'
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                </div>

                {/* Info & Controls */}
                <div className="flex-1 max-w-md">
                  <div className="mb-6">
                    <h2 className="text-2xl font-black text-white mb-1">{currentTrack.track.title}</h2>
                    <p className="text-lg text-cyan-400 font-bold">{currentTrack.track.artist}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-bold">
                        Energy: {currentTrack.track.energy || '?'}
                      </span>
                      <span className="px-3 py-1 rounded-lg bg-pink-500/20 text-pink-400 text-xs font-bold">
                        {currentTrack.track.key || 'Unknown Key'}
                      </span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-6">
                    <div
                      className="h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer"
                      onClick={(e) => {
                        if (duration > 0) {
                          const rect = e.currentTarget.getBoundingClientRect()
                          const percent = (e.clientX - rect.left) / rect.width
                          setPlayerState({ currentTime: percent * duration })
                          haptics.light()
                        }
                      }}
                    >
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-pink-500"
                        style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                      />
                    </div>
                    <div className="flex justify-between text-xs font-mono text-white/50 mt-2">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-6 mb-6">
                    <button
                      onClick={() => {
                        haptics.light()
                        skipPrevious()
                      }}
                      disabled={playingNodeIndex === null || playingNodeIndex <= 0}
                      className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center disabled:opacity-30"
                    >
                      <SkipBack className="w-6 h-6 text-white" />
                    </button>

                    <motion.button
                      onClick={handlePlayPause}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        'w-20 h-20 rounded-full flex items-center justify-center',
                        isPlaying
                          ? 'bg-green-500 text-black shadow-[0_0_30px_rgba(34,197,94,0.5)]'
                          : 'bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.3)]'
                      )}
                    >
                      {isPlaying ? (
                        <Pause className="w-10 h-10" />
                      ) : (
                        <Play className="w-10 h-10 ml-1" />
                      )}
                    </motion.button>

                    <button
                      onClick={() => {
                        haptics.light()
                        skipNext()
                      }}
                      disabled={playingNodeIndex === null || playingNodeIndex >= playlist.length - 1}
                      className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center disabled:opacity-30"
                    >
                      <SkipForward className="w-6 h-6 text-white" />
                    </button>
                  </div>

                  {/* Volume */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        haptics.light()
                        setPlayerState({ volume: volume > 0 ? 0 : 80 })
                      }}
                      className="text-white/50"
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
                    <span className="text-xs font-mono text-white/50 w-8 text-right">{volume}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
