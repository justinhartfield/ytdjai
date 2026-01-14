'use client'

import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { formatDuration } from '@/lib/utils'
import { formatTime } from './YouTubePlayer'
import { useYTDJStore } from '@/store'

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
  const activeTrackIndex = playingNodeIndex ?? 0
  const totalDuration = playlist.reduce((acc, node) => acc + node.track.duration, 0)

  return (
    <footer className="h-20 bg-[#0a0c1c]/80 backdrop-blur-xl border-t border-white/5 flex items-center px-6 gap-8 z-50">
      {/* Player Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={skipPrevious}
          disabled={playingNodeIndex === null || playingNodeIndex <= 0}
          className="text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <SkipBack className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            if (isPlaying) {
              pauseTrack()
            } else if (playingNodeIndex !== null) {
              playTrack(playingNodeIndex)
            } else if (playlist.length > 0) {
              playTrack(0)
            }
          }}
          disabled={playlist.length === 0}
          className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
        </button>
        <button
          onClick={skipNext}
          disabled={playingNodeIndex === null || playingNodeIndex >= playlist.length - 1}
          className="text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Scrubber */}
      <div className="flex-1 space-y-2">
        <div className="flex justify-between text-[10px] font-mono text-gray-500">
          <div className="flex items-center gap-3">
            <span className="text-cyan-400 font-bold uppercase tracking-wider">
              {isPlaying || playingNodeIndex !== null
                ? `Playing: ${playlist[activeTrackIndex]?.track.title || 'Unknown'}`
                : 'Ready to play'}
            </span>
            {(isPlaying || playingNodeIndex !== null) && playlist[activeTrackIndex] && (
              <>
                <span className="text-gray-600">•</span>
                <span>Energy: {playlist[activeTrackIndex]?.track.energy || 50}</span>
              </>
            )}
          </div>
          <span>
            <span className="text-white">{formatTime(currentTime)}</span> / {duration > 0 ? formatTime(duration) : formatDuration(totalDuration)}
          </span>
        </div>
        <div
          className="h-1.5 bg-white/5 rounded-full overflow-hidden relative cursor-pointer group"
          onClick={(e) => {
            if (duration > 0) {
              const rect = e.currentTarget.getBoundingClientRect()
              const percent = (e.clientX - rect.left) / rect.width
              setPlayerState({ currentTime: percent * duration })
            }
          }}
        >
          <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors" />
          <div
            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-cyan-500 to-pink-500 shadow-[0_0_10px_rgba(0,242,255,0.5)]"
            style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3 border-l border-white/10 pl-6">
        <button
          onClick={() => setPlayerState({ volume: volume > 0 ? 0 : 80 })}
          className="text-gray-500 hover:text-white transition-colors"
        >
          {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => setPlayerState({ volume: parseInt(e.target.value) })}
          className="w-20 accent-cyan-500"
        />
      </div>

      {/* Mini Player Info */}
      <div className="flex items-center gap-4 border-l border-white/10 pl-6">
        <div className="w-12 h-12 bg-black/40 border border-white/5 rounded-lg flex items-center justify-center overflow-hidden">
          <img
            src={playlist[activeTrackIndex]?.track.thumbnail || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=100&h=100&fit=crop'}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="text-left overflow-hidden max-w-[160px]">
          <div className="text-[10px] font-bold text-white truncate uppercase tracking-tighter">
            {playlist[activeTrackIndex]?.track.title || 'No Track'}
          </div>
          <div className="text-[9px] text-gray-500 truncate">
            {playlist[activeTrackIndex]?.track.artist || 'YouTube Source'}
          </div>
        </div>
      </div>
    </footer>
  )
}
