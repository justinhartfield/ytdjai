'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import YouTube, { YouTubeProps, YouTubePlayer as YTPlayer } from 'react-youtube'
import { useYTDJStore } from '@/store'

/**
 * Dual YouTube Player for AutoMix crossfade support
 *
 * Architecture:
 * - Two hidden YouTube players (A and B)
 * - While A plays, B preloads the next track
 * - Crossfade achieved via volume ducking (A fades out while B fades in)
 * - Players swap roles after each transition
 *
 * Flow:
 * 1. Track starts on Player A (activePlayer = 'A')
 * 2. Preload next track on Player B (paused, volume 0)
 * 3. When current track reaches transition point:
 *    - Start crossfade interval
 *    - Gradually decrease Player A volume, increase Player B volume
 *    - Start Player B playback at mixInPoint
 * 4. On crossfade complete:
 *    - Stop Player A
 *    - Set activePlayer = 'B'
 *    - Preload next-next track on Player A
 * 5. Repeat with swapped roles
 */
export function DualYouTubePlayer() {
  const playerARef = useRef<YTPlayer | null>(null)
  const playerBRef = useRef<YTPlayer | null>(null)
  const crossfadeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Track ready state for each player
  const [playerAReady, setPlayerAReady] = useState(false)
  const [playerBReady, setPlayerBReady] = useState(false)

  const {
    autoMix,
    dualPlayer,
    setDualPlayerState,
    player,
    setPlayerState,
    currentSet,
    skipNext,
  } = useYTDJStore()

  const playlist = currentSet?.playlist || []
  const currentIndex = player.playingNodeIndex

  // Get the active player ref
  const getActivePlayerRef = useCallback(() => {
    return dualPlayer.activePlayer === 'A' ? playerARef : playerBRef
  }, [dualPlayer.activePlayer])

  // Get the inactive player ref (for preloading)
  const getInactivePlayerRef = useCallback(() => {
    return dualPlayer.activePlayer === 'A' ? playerBRef : playerARef
  }, [dualPlayer.activePlayer])

  // Calculate when to start crossfade
  const getMixOutPoint = useCallback(
    (trackIndex: number): number => {
      const node = playlist[trackIndex]
      if (!node) return 30

      const transition = node.transitionToNext
      if (transition?.mixOutPoint) {
        return transition.mixOutPoint
      }

      // Default: last 30 seconds, but adjust based on track duration
      const duration = node.track.duration
      return Math.min(30, duration * 0.15) // 15% of track or 30s, whichever is smaller
    },
    [playlist]
  )

  // Calculate crossfade duration for a transition
  const getCrossfadeDuration = useCallback(
    (trackIndex: number): number => {
      const node = playlist[trackIndex]
      if (!node) return autoMix.crossfadeDuration

      const transition = node.transitionToNext
      if (transition?.crossfadeDuration) {
        return transition.crossfadeDuration
      }

      return autoMix.crossfadeDuration
    },
    [playlist, autoMix.crossfadeDuration]
  )

  // Preload next track on inactive player
  const preloadNextTrack = useCallback(() => {
    if (!autoMix.enabled || currentIndex === null) return
    if (dualPlayer.nextTrackPreloaded) return

    const nextIndex = currentIndex + 1
    if (nextIndex >= playlist.length) return

    const nextTrack = playlist[nextIndex]?.track
    if (!nextTrack?.youtubeId) return

    const inactiveVideoIdKey =
      dualPlayer.activePlayer === 'A' ? 'playerBVideoId' : 'playerAVideoId'

    // Set the video ID - this will trigger the player to load
    setDualPlayerState({
      [inactiveVideoIdKey]: nextTrack.youtubeId,
      nextTrackPreloaded: true,
    })

    console.log('[DualPlayer] Preloading next track:', nextTrack.title)
  }, [
    autoMix.enabled,
    currentIndex,
    dualPlayer.nextTrackPreloaded,
    dualPlayer.activePlayer,
    playlist,
    setDualPlayerState,
  ])

  // Execute crossfade transition
  const startCrossfade = useCallback(() => {
    if (dualPlayer.isCrossfading || currentIndex === null) return
    if (currentIndex >= playlist.length - 1) return // Last track, no crossfade

    const nextIndex = currentIndex + 1
    const nextNode = playlist[nextIndex]
    if (!nextNode?.track.youtubeId) return

    console.log('[DualPlayer] Starting crossfade to:', nextNode.track.title)

    setDualPlayerState({ isCrossfading: true, crossfadeProgress: 0 })

    const duration = getCrossfadeDuration(currentIndex) * 1000 // Convert to ms
    const steps = 50 // Number of volume steps
    const stepDuration = duration / steps
    let currentStep = 0

    // Get player refs
    const outgoingPlayer = getActivePlayerRef()
    const incomingPlayer = getInactivePlayerRef()

    // Start the incoming player (it's been preloaded)
    const mixInPoint = nextNode.startTime || 0
    if (incomingPlayer.current && playerBReady) {
      try {
        incomingPlayer.current.seekTo(mixInPoint, true)
        incomingPlayer.current.setVolume(0)
        incomingPlayer.current.playVideo()
      } catch (e) {
        console.error('[DualPlayer] Error starting incoming player:', e)
      }
    }

    crossfadeIntervalRef.current = setInterval(() => {
      currentStep++
      const progress = currentStep / steps

      // Calculate volumes using an easing function for smoother crossfade
      // Using sine curve for natural-sounding crossfade
      const outgoingVolume = Math.round(Math.cos((progress * Math.PI) / 2) * player.volume)
      const incomingVolume = Math.round(Math.sin((progress * Math.PI) / 2) * player.volume)

      // Update player volumes
      try {
        if (outgoingPlayer.current) {
          outgoingPlayer.current.setVolume(outgoingVolume)
        }
        if (incomingPlayer.current) {
          incomingPlayer.current.setVolume(incomingVolume)
        }
      } catch (e) {
        // Player might not be ready
      }

      // Update state
      const outgoingVolumeKey =
        dualPlayer.activePlayer === 'A' ? 'playerAVolume' : 'playerBVolume'
      const incomingVolumeKey =
        dualPlayer.activePlayer === 'A' ? 'playerBVolume' : 'playerAVolume'

      setDualPlayerState({
        [outgoingVolumeKey]: outgoingVolume,
        [incomingVolumeKey]: incomingVolume,
        crossfadeProgress: progress,
      })

      // Complete crossfade
      if (currentStep >= steps) {
        clearInterval(crossfadeIntervalRef.current!)
        crossfadeIntervalRef.current = null
        completeCrossfade()
      }
    }, stepDuration)
  }, [
    dualPlayer.isCrossfading,
    dualPlayer.activePlayer,
    currentIndex,
    playlist,
    player.volume,
    getCrossfadeDuration,
    getActivePlayerRef,
    getInactivePlayerRef,
    playerBReady,
    setDualPlayerState,
  ])

  // Complete the crossfade transition
  const completeCrossfade = useCallback(() => {
    console.log('[DualPlayer] Crossfade complete')

    // Stop and reset outgoing player
    const outgoingPlayer = getActivePlayerRef()
    try {
      if (outgoingPlayer.current) {
        outgoingPlayer.current.pauseVideo()
        outgoingPlayer.current.seekTo(0, true)
      }
    } catch (e) {
      // Player might not be ready
    }

    // Swap active player
    const newActivePlayer = dualPlayer.activePlayer === 'A' ? 'B' : 'A'

    // Update state
    setDualPlayerState({
      activePlayer: newActivePlayer,
      isCrossfading: false,
      crossfadeProgress: 0,
      nextTrackPreloaded: false,
      playerAVolume: newActivePlayer === 'A' ? player.volume : 0,
      playerBVolume: newActivePlayer === 'B' ? player.volume : 0,
      transitionScheduledAt: null,
    })

    // Move to next track in the main player state
    skipNext()

    // Schedule preloading of next track (with small delay to let state settle)
    setTimeout(() => {
      preloadNextTrack()
    }, 1000)
  }, [
    dualPlayer.activePlayer,
    player.volume,
    getActivePlayerRef,
    setDualPlayerState,
    skipNext,
    preloadNextTrack,
  ])

  // Check for transition point in current playback
  const checkForTransitionPoint = useCallback(() => {
    if (!autoMix.enabled) return
    if (dualPlayer.isCrossfading) return
    if (currentIndex === null) return
    if (currentIndex >= playlist.length - 1) return // Last track

    const mixOutPoint = getMixOutPoint(currentIndex)
    const transitionTime = player.duration - mixOutPoint

    // Check if we've reached the transition point
    if (player.currentTime >= transitionTime && player.currentTime < player.duration - 2) {
      startCrossfade()
    }
  }, [
    autoMix.enabled,
    dualPlayer.isCrossfading,
    currentIndex,
    playlist.length,
    player.duration,
    player.currentTime,
    getMixOutPoint,
    startCrossfade,
  ])

  // Monitor playback position for transition
  useEffect(() => {
    if (!autoMix.enabled || !player.isPlaying) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      return
    }

    progressIntervalRef.current = setInterval(checkForTransitionPoint, 500)

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }
  }, [autoMix.enabled, player.isPlaying, checkForTransitionPoint])

  // Preload next track when playback starts or index changes
  useEffect(() => {
    if (player.isPlaying && !dualPlayer.nextTrackPreloaded && !dualPlayer.isCrossfading) {
      // Small delay to let current track settle
      const timeout = setTimeout(preloadNextTrack, 2000)
      return () => clearTimeout(timeout)
    }
  }, [
    player.isPlaying,
    currentIndex,
    dualPlayer.nextTrackPreloaded,
    dualPlayer.isCrossfading,
    preloadNextTrack,
  ])

  // Sync volume changes to active player
  useEffect(() => {
    if (dualPlayer.isCrossfading) return // Don't interfere during crossfade

    const activePlayer = getActivePlayerRef()
    try {
      if (activePlayer.current) {
        activePlayer.current.setVolume(player.volume)
      }
    } catch (e) {
      // Player might not be ready
    }
  }, [player.volume, dualPlayer.isCrossfading, getActivePlayerRef])

  // Handle player ready events
  const onPlayerAReady: YouTubeProps['onReady'] = (event) => {
    playerARef.current = event.target
    setPlayerAReady(true)
    event.target.unMute()

    // If this is the active player and we should be playing
    if (dualPlayer.activePlayer === 'A' && player.isPlaying) {
      event.target.setVolume(player.volume)
      event.target.playVideo()
    } else {
      event.target.setVolume(0)
    }
  }

  const onPlayerBReady: YouTubeProps['onReady'] = (event) => {
    playerBRef.current = event.target
    setPlayerBReady(true)
    event.target.unMute()

    // If this is the active player and we should be playing
    if (dualPlayer.activePlayer === 'B' && player.isPlaying) {
      event.target.setVolume(player.volume)
      event.target.playVideo()
    } else {
      event.target.setVolume(0)
    }
  }

  // Handle state changes for active player
  const handleStateChange = (event: { data: number }, playerLabel: 'A' | 'B') => {
    // Only handle state changes for the active player
    if (dualPlayer.activePlayer !== playerLabel) return
    if (dualPlayer.isCrossfading) return

    const state = event.data

    // YouTube states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
    if (state === 1) {
      // Playing
      const playerRef = playerLabel === 'A' ? playerARef : playerBRef
      const duration = playerRef.current?.getDuration() || 0
      setPlayerState({ duration, isPlaying: true })
      startProgressTracking(playerRef)
    } else if (state === 2) {
      // Paused
      setPlayerState({ isPlaying: false })
      stopProgressTracking()
    } else if (state === 0) {
      // Ended - this shouldn't happen with AutoMix (crossfade should trigger before end)
      // But handle it as fallback
      stopProgressTracking()
      if (!dualPlayer.isCrossfading) {
        skipNext()
      }
    }
  }

  // Progress tracking for current time
  const startProgressTracking = useCallback(
    (playerRef: React.MutableRefObject<YTPlayer | null>) => {
      if (progressIntervalRef.current) return

      progressIntervalRef.current = setInterval(() => {
        if (playerRef.current) {
          try {
            const currentTime = playerRef.current.getCurrentTime() || 0
            setPlayerState({ currentTime })
          } catch (e) {
            // Player might be destroyed
          }
        }
      }, 500)
    },
    [setPlayerState]
  )

  const stopProgressTracking = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (crossfadeIntervalRef.current) {
        clearInterval(crossfadeIntervalRef.current)
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  // Control playback based on state
  useEffect(() => {
    if (dualPlayer.isCrossfading) return // Don't interfere during crossfade

    const activePlayer = getActivePlayerRef()
    if (!activePlayer.current) return

    try {
      if (player.isPlaying) {
        activePlayer.current.playVideo()
      } else {
        activePlayer.current.pauseVideo()
      }
    } catch (e) {
      // Player might not be ready
    }
  }, [player.isPlaying, dualPlayer.isCrossfading, getActivePlayerRef])

  // Player options
  const opts: YouTubeProps['opts'] = {
    height: '1',
    width: '1',
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      origin: typeof window !== 'undefined' ? window.location.origin : '',
    },
  }

  // Get current video IDs
  const playerAVideoId = dualPlayer.playerAVideoId
  const playerBVideoId = dualPlayer.playerBVideoId

  // Initialize active player with current track if not set
  useEffect(() => {
    if (!player.currentVideoId) return

    const activeVideoIdKey =
      dualPlayer.activePlayer === 'A' ? 'playerAVideoId' : 'playerBVideoId'
    const currentActiveVideoId =
      dualPlayer.activePlayer === 'A' ? playerAVideoId : playerBVideoId

    if (!currentActiveVideoId && autoMix.enabled) {
      setDualPlayerState({
        [activeVideoIdKey]: player.currentVideoId,
      })
    }
  }, [
    player.currentVideoId,
    dualPlayer.activePlayer,
    playerAVideoId,
    playerBVideoId,
    autoMix.enabled,
    setDualPlayerState,
  ])

  // Don't render if AutoMix is disabled
  if (!autoMix.enabled) {
    return null
  }

  return (
    <div
      className="fixed opacity-0 pointer-events-none"
      aria-hidden="true"
      style={{ position: 'absolute', top: -9999, left: -9999 }}
    >
      {/* Player A */}
      {playerAVideoId && (
        <YouTube
          videoId={playerAVideoId}
          opts={opts}
          onReady={onPlayerAReady}
          onStateChange={(e) => handleStateChange(e, 'A')}
          onError={(e) => {
            console.error('[DualPlayer A] Error:', e.data)
          }}
        />
      )}

      {/* Player B */}
      {playerBVideoId && (
        <YouTube
          videoId={playerBVideoId}
          opts={opts}
          onReady={onPlayerBReady}
          onStateChange={(e) => handleStateChange(e, 'B')}
          onError={(e) => {
            console.error('[DualPlayer B] Error:', e.data)
          }}
        />
      )}
    </div>
  )
}
