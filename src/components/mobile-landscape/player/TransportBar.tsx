'use client'

import { motion } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useYTDJStore } from '@/store'
import { haptics } from '@/lib/haptics'
import { formatTime } from '@/components/features/YouTubePlayer'

export function TransportBar() {
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

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect()
      const percent = (e.clientX - rect.left) / rect.width
      setPlayerState({ currentTime: percent * duration })
      haptics.light()
    }
  }

  return (
    <div className="flex-shrink-0 h-16 border-t border-white/5 bg-[#0a0c1c]/80 backdrop-blur-xl">
      <div className="h-full flex items-center px-4 gap-4">
        {/* Skip Previous */}
        <button
          onClick={() => {
            haptics.light()
            skipPrevious()
          }}
          disabled={playingNodeIndex === null || playingNodeIndex <= 0}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center disabled:opacity-30 transition-colors"
        >
          <SkipBack className="w-4 h-4 text-white" />
        </button>

        {/* Play/Pause */}
        <motion.button
          onClick={handlePlayPause}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center transition-all',
            isPlaying
              ? 'bg-green-500 text-black shadow-[0_0_25px_rgba(34,197,94,0.4)]'
              : 'bg-white text-black shadow-[0_0_25px_rgba(255,255,255,0.2)]'
          )}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </motion.button>

        {/* Skip Next */}
        <button
          onClick={() => {
            haptics.light()
            skipNext()
          }}
          disabled={playingNodeIndex === null || playingNodeIndex >= playlist.length - 1}
          className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center disabled:opacity-30 transition-colors"
        >
          <SkipForward className="w-4 h-4 text-white" />
        </button>

        {/* Progress Bar */}
        <div className="flex-1 flex items-center gap-3">
          {/* Current Time */}
          <span className="text-[10px] font-mono text-white/50 w-10 text-right">
            {formatTime(currentTime)}
          </span>

          {/* Progress Track */}
          <div
            className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer relative group"
            onClick={handleProgressClick}
          >
            {/* Progress Fill */}
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-pink-500"
              style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
            />

            {/* Hover indicator */}
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />

            {/* Playhead */}
            {duration > 0 && (
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${(currentTime / duration) * 100}% - 6px)` }}
              />
            )}
          </div>

          {/* Duration */}
          <span className="text-[10px] font-mono text-white/50 w-10">
            {formatTime(duration)}
          </span>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 w-[120px]">
          <button
            onClick={() => {
              haptics.light()
              setPlayerState({ volume: volume > 0 ? 0 : 80 })
            }}
            className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white/80 transition-colors"
          >
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => {
              setPlayerState({ volume: parseInt(e.target.value) })
            }}
            className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* Track Info (compact) */}
        {currentTrack && (
          <div className="w-[150px] flex-shrink-0 text-right">
            <p className="text-xs font-bold text-white truncate">{currentTrack.track.title}</p>
            <p className="text-[10px] text-white/50 truncate">{currentTrack.track.artist}</p>
          </div>
        )}
      </div>
    </div>
  )
}
