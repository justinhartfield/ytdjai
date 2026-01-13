'use client'

import { useEffect, useRef, useCallback } from 'react'
import YouTube, { YouTubeProps, YouTubePlayer as YTPlayer } from 'react-youtube'
import { useYTDJStore } from '@/store'

interface YouTubePlayerProps {
  className?: string
}

export function YouTubePlayer({ className }: YouTubePlayerProps) {
  const playerRef = useRef<YTPlayer | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const {
    player,
    setPlayerState,
    skipNext,
    currentSet
  } = useYTDJStore()

  const { currentVideoId, isPlaying, volume } = player

  // Debug logging
  console.log('[YouTubePlayer] Render - videoId:', currentVideoId, 'isPlaying:', isPlaying)

  // Handle player ready
  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    console.log('[YouTubePlayer] Player ready, videoId:', currentVideoId, 'isPlaying:', isPlaying)
    playerRef.current = event.target
    // Ensure player is unmuted and volume is set
    playerRef.current.unMute()
    playerRef.current.setVolume(volume)
    console.log('[YouTubePlayer] Volume set to:', volume, 'isMuted:', playerRef.current.isMuted())
    // Explicitly start playback when player is ready if isPlaying is true
    // This is needed because autoplay may be blocked by the browser
    if (isPlaying) {
      console.log('[YouTubePlayer] Calling playVideo()')
      playerRef.current.playVideo()
    }
  }

  // Handle state changes
  const onStateChange: YouTubeProps['onStateChange'] = (event) => {
    const state = event.data
    console.log('[YouTubePlayer] State change:', state, '(-1=unstarted, 0=ended, 1=playing, 2=paused, 3=buffering, 5=cued)')

    // YouTube states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
    if (state === 1) {
      // Playing - start progress tracking
      const duration = playerRef.current?.getDuration() || 0
      setPlayerState({ duration, isPlaying: true })
      startProgressTracking()
    } else if (state === 2) {
      // Paused
      setPlayerState({ isPlaying: false })
      stopProgressTracking()
    } else if (state === 0) {
      // Ended - play next track
      stopProgressTracking()
      skipNext()
    }
  }

  // Start tracking progress
  const startProgressTracking = useCallback(() => {
    if (intervalRef.current) return

    intervalRef.current = setInterval(() => {
      if (playerRef.current) {
        const currentTime = playerRef.current.getCurrentTime() || 0
        setPlayerState({ currentTime })
      }
    }, 500)
  }, [setPlayerState])

  // Stop tracking progress
  const stopProgressTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Control playback based on state
  useEffect(() => {
    if (!playerRef.current) return

    if (isPlaying) {
      playerRef.current.playVideo()
    } else {
      playerRef.current.pauseVideo()
    }
  }, [isPlaying, currentVideoId])

  // Update volume
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setVolume(volume)
    }
  }, [volume])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProgressTracking()
    }
  }, [stopProgressTracking])

  // Player options - small but visible player to avoid browser muting
  // Browsers may mute videos with 0x0 dimensions
  const opts: YouTubeProps['opts'] = {
    height: '1',
    width: '1',
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      origin: typeof window !== 'undefined' ? window.location.origin : ''
    },
  }

  if (!currentVideoId) {
    return null
  }

  return (
    <div className={className} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}>
      <YouTube
        videoId={currentVideoId}
        opts={opts}
        onReady={onPlayerReady}
        onStateChange={onStateChange}
        onError={(e: Parameters<NonNullable<YouTubeProps['onError']>>[0]) => {
          const errorCodes: Record<number, string> = {
            2: 'Invalid video ID',
            5: 'HTML5 player error',
            100: 'Video not found or removed',
            101: 'Video not embeddable',
            150: 'Video not embeddable (same as 101)'
          }
          console.error('[YouTubePlayer] Error:', e.data, '-', errorCodes[e.data] || 'Unknown error')
        }}
      />
    </div>
  )
}

// Format time helper (exported for use in transport bar)
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
